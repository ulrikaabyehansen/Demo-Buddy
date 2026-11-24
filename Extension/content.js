'use strict';

// ─── Default Settings ─────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  enabled: false,
  companyOriginal: '',
  companyReplacement: '',
  emailDomainOriginal: '',
  emailDomainReplacement: '',
  serialMode: 'scramble' // 'scramble' | 'blur'
};

let settings = { ...DEFAULT_SETTINGS };

// Track processed nodes to avoid double-processing in MutationObserver
let processedNodes = new WeakSet();

// Track shadow roots we're already observing
const observedRoots = new WeakSet();

// Keep a stable serial → scrambled mapping so the same serial always looks the same
const scrambleMap = new Map();
// Outputs we generated, so re-walks never scramble an already-scrambled serial
const scrambledOutputs = new Set();

let domObserver = null;

// ─── Serial Detection ─────────────────────────────────────────────────────────
// Apple (and most device) serials: 10–12 uppercase alphanumeric chars
// Must contain at least one digit AND at least one letter to avoid false positives
function serialRegex() {
  return /\b[A-Z0-9]{10,12}\b/g;
}

function isLikelySerial(str) {
  return /[0-9]/.test(str) && /[A-Z]/.test(str);
}

// ─── Scrambling ───────────────────────────────────────────────────────────────
const SCRAMBLE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';

function scrambleSerial(serial) {
  return Array.from(serial)
    .map(() => SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)])
    .join('');
}

function getScrambled(serial) {
  if (!scrambleMap.has(serial)) {
    const out = scrambleSerial(serial);
    scrambleMap.set(serial, out);
    scrambledOutputs.add(out);
  }
  return scrambleMap.get(serial);
}

// ─── Strip common legal suffixes from a company name ─────────────────────────
const CORP_SUFFIX_RE = /[\s,]+(?:ApS|A\/S|A\.S\.|Inc\.?|Ltd\.?|LLC|GmbH|Corp\.?|S\.A\.|NV|BV|SRL|SAS|AG|PLC|Oy|AB|AS)\.?$/i;

function stripCorpSuffix(name) {
  return name.replace(CORP_SUFFIX_RE, '').trim();
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Text Replacements (company + email) ─────────────────────────────────────
function applyTextReplacements(text) {
  let result = text;

  // Email domain runs FIRST — prevents company base-name regex from mangling
  // the domain portion of an address before the email rule gets a chance to fire.
  // Normalise: strip leading @ so "talktech.dk" matches both "@talktech.dk" AND
  // standalone "TALKTECH.DK", while preserving the @ in the output when present.
  if (settings.emailDomainOriginal && settings.emailDomainReplacement) {
    const emailOrig = settings.emailDomainOriginal.trim().replace(/^@/, '');
    const emailRepl = settings.emailDomainReplacement.trim().replace(/^@/, '');
    result = result.replace(
      new RegExp('(@?)' + escapeRegex(emailOrig), 'gi'),
      (_, at) => at + emailRepl
    );
  }

  if (settings.companyOriginal && settings.companyReplacement) {
    const origFull = settings.companyOriginal.trim();
    const replFull = settings.companyReplacement.trim();
    const origBase = stripCorpSuffix(origFull);
    const replBase = stripCorpSuffix(replFull);

    // Replace full name first (e.g. "Talktech ApS" → "Betterbag Inc")
    result = result.replace(new RegExp(escapeRegex(origFull), 'gi'), replFull);

    // Also replace bare name without suffix (e.g. "Talktech" → "Betterbag")
    if (origBase.length > 0 && origBase !== origFull) {
      result = result.replace(new RegExp('\\b' + escapeRegex(origBase) + '\\b', 'gi'), replBase);
    }
  }

  return result;
}

function hasAnySerial(text) {
  const re = serialRegex();
  let m;
  while ((m = re.exec(text)) !== null) {
    if (isLikelySerial(m[0])) return true;
  }
  return false;
}

// ─── Blur list helpers ────────────────────────────────────────────────────────
function getBlurTerms() {
  if (!settings.blurList) return [];
  return settings.blurList.split(',').map(t => t.trim()).filter(t => t.length > 0);
}

function hasAnyBlurTerm(text, terms) {
  return terms.some(term => new RegExp(escapeRegex(term), 'i').test(text));
}

// ─── Unified blur splitter (serials + blur-list terms) ───────────────────────
// Returns [{text, isBlurred}, ...] covering the entire input string.
function collectBlurRanges(text, blurTerms, includeSerials) {
  const ranges = [];

  if (includeSerials) {
    const re = serialRegex();
    let m;
    while ((m = re.exec(text)) !== null) {
      if (isLikelySerial(m[0]))
        ranges.push({ start: m.index, end: m.index + m[0].length });
    }
  }

  for (const term of blurTerms) {
    const re = new RegExp(escapeRegex(term), 'gi');
    let m;
    while ((m = re.exec(text)) !== null)
      ranges.push({ start: m.index, end: m.index + m[0].length });
  }

  if (ranges.length === 0) return [{ text, isBlurred: false }];

  // Sort and merge overlapping ranges
  ranges.sort((a, b) => a.start - b.start);
  const merged = [{ ...ranges[0] }];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    if (ranges[i].start <= last.end) last.end = Math.max(last.end, ranges[i].end);
    else merged.push({ ...ranges[i] });
  }

  // Build parts array
  const parts = [];
  let pos = 0;
  for (const r of merged) {
    if (r.start > pos) parts.push({ text: text.slice(pos, r.start), isBlurred: false });
    parts.push({ text: text.slice(r.start, r.end), isBlurred: true });
    pos = r.end;
  }
  if (pos < text.length) parts.push({ text: text.slice(pos), isBlurred: false });
  return parts;
}

// ─── Process a single text node ───────────────────────────────────────────────
function processNode(node) {
  if (processedNodes.has(node)) return;
  processedNodes.add(node);

  const original = node.textContent;
  if (!original.trim()) return;

  // Step 1: text replacements (company, email)
  let replaced = applyTextReplacements(original);

  // Step 2: serial scramble (text-only, no DOM surgery needed)
  if (settings.serialMode === 'scramble') {
    replaced = replaced.replace(serialRegex(), (match) =>
      isLikelySerial(match) && !scrambledOutputs.has(match) ? getScrambled(match) : match
    );
  }

  // Step 3: decide if we need DOM surgery for blur spans
  const blurTerms = getBlurTerms();
  const needsSerialBlur = settings.serialMode === 'blur' && hasAnySerial(replaced);
  const needsBlurList  = blurTerms.length > 0 && hasAnyBlurTerm(replaced, blurTerms);

  if (!needsSerialBlur && !needsBlurList) {
    if (replaced !== original) node.textContent = replaced;
    return;
  }

  // Build DOM fragment with blur spans
  const parts = collectBlurRanges(replaced, needsBlurList ? blurTerms : [], needsSerialBlur);
  const parent = node.parentNode;
  if (!parent) return;

  const fragment = document.createDocumentFragment();
  for (const part of parts) {
    if (part.isBlurred) {
      const span = document.createElement('span');
      span.textContent = part.text;
      span.style.cssText = 'filter:blur(5px);user-select:none;display:inline-block;';
      span.dataset.demoMasked = 'blurred';
      fragment.appendChild(span);
    } else {
      const tn = document.createTextNode(part.text);
      processedNodes.add(tn);
      fragment.appendChild(tn);
    }
  }

  parent.replaceChild(fragment, node);
}

// ─── Replace text in element attributes ───────────────────────────────────────
function processAttributes(el) {
  const attrs = ['aria-label', 'title', 'placeholder', 'alt', 'value'];
  for (const attr of attrs) {
    const val = el.getAttribute(attr);
    if (!val) continue;
    const replaced = applyTextReplacements(val);
    if (replaced !== val) el.setAttribute(attr, replaced);
  }
}

// ─── Walk the DOM (including shadow roots) ────────────────────────────────────
function walkDOM(root) {
  if (!root) return;

  if (root.nodeType === Node.TEXT_NODE) {
    processNode(root);
    return;
  }

  // Accept Element nodes and ShadowRoot
  if (root.nodeType !== Node.ELEMENT_NODE && !(root instanceof ShadowRoot)) return;

  // Walk text nodes inside this root
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (processedNodes.has(node)) return NodeFilter.FILTER_REJECT;

        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        const tag = parent.tagName;
        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'TEXTAREA'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }

        if (parent.closest('[data-demo-masked]')) return NodeFilter.FILTER_REJECT;
        if (!node.textContent.trim()) return NodeFilter.FILTER_SKIP;

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  nodes.forEach(processNode);

  // Walk element attributes and recurse into shadow roots
  const elWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const elements = [];
  let el;
  while ((el = elWalker.nextNode())) elements.push(el);

  for (const element of elements) {
    processAttributes(element);
    if (element.shadowRoot) {
      attachObserverToRoot(element.shadowRoot);
      walkDOM(element.shadowRoot);
    }
  }
}

// ─── Attach observer to a root (document or shadow root) ─────────────────────
function attachObserverToRoot(root) {
  if (!domObserver || observedRoots.has(root)) return;
  observedRoots.add(root);
  domObserver.observe(root, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

// ─── MutationObserver ─────────────────────────────────────────────────────────
function startObserver() {
  if (domObserver) return;
  domObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added element itself or its children have shadow roots
            walkDOM(node);
            if (node.shadowRoot) {
              attachObserverToRoot(node.shadowRoot);
              walkDOM(node.shadowRoot);
            }
          } else {
            walkDOM(node);
          }
        }
      } else if (mutation.type === 'characterData') {
        processedNodes.delete(mutation.target);
        processNode(mutation.target);
      }
    }
  });

  // Observe both the document body and any shadow roots found immediately
  attachObserverToRoot(document.body);
}

// ─── Re-walk helper (resets processed set so everything is re-evaluated) ──────
function reWalk() {
  processedNodes = new WeakSet();
  walkDOM(document.body);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
browser.storage.local.get(['demoMaskerSettings'], (result) => {
  if (result.demoMaskerSettings) {
    settings = { ...DEFAULT_SETTINGS, ...result.demoMaskerSettings };
  }

  if (settings.enabled) {
    startObserver(); // Start observer first so we don't miss mutations during walk
    walkDOM(document.body);

    // Poll every 1.5 s for the first 60 s — covers cross-origin Azure Portal iframes
    // that load their data via API calls well after document_idle fires.
    let polls = 0;
    const poller = setInterval(() => {
      reWalk();
      if (++polls >= 40) clearInterval(poller); // stop after 60 s
    }, 1500);

    // Re-walk on SPA navigation (history.pushState / popstate)
    const _push = history.pushState.bind(history);
    history.pushState = function (...args) {
      _push(...args);
      reWalk();
      setTimeout(reWalk, 1500);
    };
    window.addEventListener('popstate', () => {
      reWalk();
      setTimeout(reWalk, 1500);
    });
  }
});

// Reload when settings change so masking is applied cleanly from scratch
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.demoMaskerSettings) {
    location.reload();
  }
});
