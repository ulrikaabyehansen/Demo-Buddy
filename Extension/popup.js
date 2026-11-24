'use strict';

const DEFAULT_SETTINGS = {
  enabled: false,
  companyOriginal: '',
  companyReplacement: '',
  emailDomainOriginal: '',
  emailDomainReplacement: '',
  serialMode: 'scramble',
  blurList: ''
};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const enabledToggle     = document.getElementById('enabled');
const settingsContent   = document.getElementById('settingsContent');
const companyOriginalEl = document.getElementById('companyOriginal');
const companyReplaceEl  = document.getElementById('companyReplacement');
const emailOriginalEl   = document.getElementById('emailDomainOriginal');
const emailReplaceEl    = document.getElementById('emailDomainReplacement');
const blurListEl        = document.getElementById('blurList');
const optScramble       = document.getElementById('opt-scramble');
const optBlur           = document.getElementById('opt-blur');
const serialResultEl    = document.getElementById('serialResult');
const saveBtn           = document.getElementById('saveBtn');
const statusEl          = document.getElementById('status');

let currentMode = 'scramble';

// ── Helpers ───────────────────────────────────────────────────────────────────
const SCRAMBLE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';

function scrambleExample() {
  return Array.from('F9HXK1K6JF8J')
    .map(() => SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)])
    .join('');
}

function setMode(mode) {
  currentMode = mode;
  optScramble.classList.toggle('active', mode === 'scramble');
  optBlur.classList.toggle('active', mode === 'blur');
  optScramble.querySelector('input').checked = mode === 'scramble';
  optBlur.querySelector('input').checked = mode === 'blur';
  updatePreview(mode);
}

function updatePreview(mode) {
  if (mode === 'blur') {
    serialResultEl.textContent = 'F9HXK1K6JF8J';
    serialResultEl.classList.add('blurred');
  } else {
    serialResultEl.textContent = scrambleExample();
    serialResultEl.classList.remove('blurred');
  }
}

function applyEnabled(enabled) {
  settingsContent.classList.toggle('dimmed', !enabled);
}

// ── Load saved settings ───────────────────────────────────────────────────────
browser.storage.local.get(['demoMaskerSettings'], (result) => {
  const s = { ...DEFAULT_SETTINGS, ...(result.demoMaskerSettings || {}) };

  enabledToggle.checked      = s.enabled;
  companyOriginalEl.value    = s.companyOriginal;
  companyReplaceEl.value     = s.companyReplacement;
  emailOriginalEl.value      = s.emailDomainOriginal;
  emailReplaceEl.value       = s.emailDomainReplacement;
  blurListEl.value           = s.blurList || '';

  setMode(s.serialMode);
  applyEnabled(s.enabled);
});

// ── Event listeners ───────────────────────────────────────────────────────────
enabledToggle.addEventListener('change', () => {
  applyEnabled(enabledToggle.checked);
});

optScramble.addEventListener('click', () => setMode('scramble'));
optBlur.addEventListener('click', () => setMode('blur'));

saveBtn.addEventListener('click', () => {
  const newSettings = {
    enabled:               enabledToggle.checked,
    companyOriginal:       companyOriginalEl.value.trim(),
    companyReplacement:    companyReplaceEl.value.trim(),
    emailDomainOriginal:   emailOriginalEl.value.trim(),
    emailDomainReplacement: emailReplaceEl.value.trim(),
    serialMode:            currentMode,
    blurList:              blurListEl.value.trim()
  };

  browser.storage.local.set({ demoMaskerSettings: newSettings }, () => {
    statusEl.textContent = '✓ Saved! Reloading page…';
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) browser.tabs.reload(tabs[0].id);
    });
    setTimeout(() => { statusEl.textContent = ''; }, 3000);
  });
});
