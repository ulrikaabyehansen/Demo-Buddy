# Demo Buddy

A macOS menu-bar app with a Safari Web Extension that masks sensitive data during live demos. Replace company names, email domains, serial numbers, and custom terms in real time, so you can demo confidently without exposing customer or internal data.

Developed by [Talktech](https://talktech.dk). Tested with **Apple Business Manager**, **Microsoft Entra**, **Microsoft Intune**, **Jamf Pro**, and **Iru**.

---

## What it is for

If you demo device management or identity platforms for a living, you are usually logged in to a real tenant. The admin consoles show your real company name, real email addresses, real device serial numbers, and sometimes real people. Setting up a sanitised demo tenant for every product is expensive, and test data never looks as convincing as a live environment.

Demo Buddy sits in Safari and rewrites what is **displayed** on the page, not what is stored. Your tenant data stays untouched and your workflows still work. Only the pixels on screen change. Typical uses:

- **Customer demos and webinars.** Show your production Apple Business Manager or Intune tenant while the audience sees a fictional company.
- **Screen recordings and screenshots.** Capture documentation or training material without a blur pass in an editor afterwards.
- **Conference talks.** Walk through real workflows on stage without leaking serial numbers or colleagues' names.
- **Partner and reseller enablement.** Let a consultant demo from their own tenant without revealing which customers they work with.

Demo Buddy is not a security control. It changes how a page looks in your browser. It does not protect the data itself, and it does not affect other apps you might share on screen. Treat it as a presentation aid.

---

## Features

### Company Name Replacement
Replaces any occurrence of your company name across the page, including partial matches and common legal suffixes (ApS, A/S, Inc, Ltd, LLC, GmbH, Corp, AG, PLC, Oy, AB, AS, and more). Case-insensitive, so one entry catches `talktech`, `TalkTech`, and `Talktech ApS`. If you enter `Talktech ApS` as the original and `Betterbag Inc` as the replacement, the full name becomes `Betterbag Inc` and the bare word `Talktech` becomes `Betterbag`.

### Email Domain Replacement
Replaces email domains across the page. Enter `@talktech.dk` in the original field and `@betterbag.uk` in the replacement field. The leading `@` is optional, and the domain is also replaced when it appears on its own, for example as a verified domain in a tenant list. Email replacement runs before company name replacement so addresses are never corrupted by a partial match.

### Always Blur
A freeform list of sensitive terms to blur on any page: names, phone numbers, domains, anything. Enter comma-separated values. Matching is case-insensitive, and every match is wrapped in a blur overlay regardless of where it appears.

### Serial Number Masking
Automatically detects device serial numbers, defined as 10 to 12 uppercase letters and digits with at least one of each, and handles them in one of two ways:

- **Scramble** replaces each serial with a consistent fake. The same serial always maps to the same fake value within a page session, so device lists and detail pages stay consistent. The mapping resets on reload.
- **Blur** wraps each serial in a blur overlay.

Note: scrambling changes only the visible text. If a page offers a copy button that reads from its own data, the clipboard will still hold the real serial.

### Dynamic Content Support
Demo Buddy keeps watching the page after it loads. It uses a `MutationObserver` plus a short polling window to catch content that arrives late, handles shadow DOM components, runs inside iframes, and re-scans after in-page navigation in single-page apps. This covers Azure Portal blades, React consoles, and similar frameworks that update the page without a full reload.

---

## Installation

### Download the notarized build (recommended)

1. Download `Demo-Buddy-macOS.zip` from the [latest release](https://github.com/ulrikaabyehansen/Demo-Buddy/releases/latest) and unzip it.
2. Move **Demo Buddy.app** to your Applications folder and open it. The app is signed with a Developer ID certificate and notarized by Apple, so it opens without warnings.
3. A Demo Buddy icon appears in your menu bar. The app has no main window; it exists to host the Safari extension.
4. Open **Safari > Settings > Extensions** and tick **Demo Buddy**. The menu-bar icon has an "Open Safari Settings" shortcut for this.
5. When Safari asks which websites the extension may access, choose **Always Allow on Every Website**. See [Platform Notes](#platform-notes) for why this matters.

Requires macOS 15.0 or later.

### Build from source

Requires Xcode, free from the Mac App Store. Clone the repo, open `Demo Buddy.xcodeproj`, set your own team under **Signing & Capabilities** for both targets, and press **⌘R**. The Demo Buddy icon will appear in your menu bar. Enable the extension in **Safari > Settings > Extensions** as above.

---

## How to use it

### Before the demo

1. Open the page you plan to demo, for example your Apple Business Manager device list.
2. Click the **Demo Buddy** button in Safari's toolbar to open the settings popup.
3. Switch the toggle in the top-right corner **on**. Masking is off by default and the settings are greyed out until you enable it.
4. Fill in the fields you need. Leave any field blank to skip that kind of masking.
   - **Company Name**: original on the left, replacement on the right.
   - **Email Domain**: original on the left, replacement on the right.
   - **Always Blur**: comma-separated terms.
   - **Serial Numbers**: choose **Scramble** or **Blur**. The preview shows what a serial will look like.
5. Click **Save & Reload Page**. The current tab reloads with masking applied. Settings are stored in Safari and persist across restarts.
6. Click through the screens you will show and check that everything you care about is masked. Pages that load data late may take a couple of seconds to finish.

### During the demo

- Masking stays active on every page you open until you switch the toggle off. There is nothing to do per page.
- If you navigate to a new area and spot unmasked data, give it a moment. If it is still visible, reload the page.
- You can add a term to **Always Blur** mid-demo. Saving reloads the page, so do this between screens rather than in the middle of a workflow.

### After the demo

Open the popup, switch the toggle **off**, and click **Save & Reload Page**. Your pages return to normal. Keep in mind that while the extension is enabled it rewrites every website, including this README on GitHub, so it is easy to forget it is on.

### Tips

- Use one entry per company. Demo Buddy strips legal suffixes itself, so `Talktech ApS` already covers `Talktech`.
- Pick a replacement company name that is roughly the same length as the original. Long replacements can wrap in narrow table columns.
- Scrambled serials change every time the page reloads. If a workflow needs you to reference the same serial across several pages, use **Blur** instead, or avoid reloading between them.
- Test with the exact browser window size you will present in. Some consoles render different components at different widths.

---

## What it does not mask

- Text inside images, charts drawn on a canvas, PDFs, or embedded video.
- Text you type into form fields during the demo.
- Content in other applications, Finder windows, notifications, or other browsers. Demo Buddy only runs inside Safari pages.
- Data behind a page's own copy or export buttons, which read from the underlying data rather than the displayed text.

If any of these matter for your demo, combine Demo Buddy with a screen-share of a single Safari window and turn off notifications.

---

## Platform Notes

**Microsoft Intune, Entra, and other cross-origin iframes.** In **Safari > Settings > Extensions > Demo Buddy**, set website access to **All Websites**. Without this, the extension cannot inject into iframes served from a different origin, such as Azure Portal Framework blades, and content inside those frames will stay unmasked.

**Privacy.** Demo Buddy processes everything locally in Safari. Settings are stored in Safari's extension storage on your Mac. Nothing is sent anywhere, and the app has no network features.

---

## Feedback

For feature requests or questions, email [info@talktech.dk](mailto:info@talktech.dk) or open an issue on GitHub.

## License

[Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/)

Free to use, modify, and share for personal and non-commercial use. Commercial use and App Store distribution are not permitted. Attribution required.
