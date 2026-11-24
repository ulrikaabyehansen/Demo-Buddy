# Demo Buddy

A macOS menu-bar app with a Safari Web Extension that masks sensitive data during live demos. Replace company names, email domains, serial numbers, and custom terms in real time — so you can demo confidently without exposing customer or internal data.

Tested with: **Apple Business Manager**, **Microsoft Entra**, **Microsoft Intune**, **Jamf Pro**, **Iru**.

---

## Features

### Company Name Replacement
Replaces any occurrence of your company name across the page, including partial matches and common legal suffixes (ApS, Inc, Ltd, A/S, etc.). Case-insensitive — catches `talktech`, `TalkTech`, and `Talktech ApS` with a single entry.

### Email Domain Replacement
Replaces email domains across the page. Enter `@talktech.dk` in the original field and `@betterbag.uk` in the replacement field. Runs before company name replacement so email addresses are never corrupted by a partial match.

### Always Blur
A freeform list of sensitive terms to blur on any page — names, phone numbers, domains, anything. Enter comma-separated values. All matches are wrapped in a blur overlay regardless of context.

### Serial Number Masking
Automatically detects device serial numbers (10–12 uppercase alphanumeric characters) and either:
- **Scramble** — replaces each serial with a consistent fake (same serial always maps to the same value within a page session) NOTE: A copy of a scrambled serial number will still hold the correct serial number on clipboard. 
- **Blur** — wraps each serial in a blur overlay

### SPA & Dynamic Content Support
Uses a `MutationObserver` combined with a polling interval to catch content loaded dynamically after the initial page render. Works with Azure Portal blades, React SPAs, and other frameworks that update the DOM without a full page reload.

---

## Getting Started

Requires Xcode (free from the Mac App Store). Clone the repo, open `Demo Buddy.xcodeproj`, set your own team under **Signing & Capabilities** for both targets, and press **⌘R**. The Demo Buddy icon will appear in your menu bar. Enable the extension in **Safari → Settings → Extensions**.

---

## Platform Notes

Microsoft **Intune+Entra / cross-origin iframes:** In Safari → Settings → Extensions → Demo Buddy, set website access to **All Websites**. Without this, the extension cannot inject into iframes served from a different origin (e.g. Azure Portal Framework blades).

## License

[Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/)

Free to use, modify, and share for personal and non-commercial use. Commercial use and App Store distribution are not permitted. Attribution required.
