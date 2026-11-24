import Cocoa
import SafariServices

@main
class AppDelegate: NSObject, NSApplicationDelegate {

    private var statusItem: NSStatusItem!
    private var onboardingWindowController: NSWindowController?

    // MARK: - Launch

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Menu-bar-only app — no Dock icon
        NSApp.setActivationPolicy(.accessory)
        setupStatusBar()
    }

    // MARK: - Status bar

    private func setupStatusBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        guard let btn = statusItem.button else { return }

        let img = NSImage(systemSymbolName: "eyes.inverse", accessibilityDescription: "Demo Buddy")
        img?.isTemplate = true
        btn.image = img

        statusItem.menu = buildMenu()
    }

    private func buildMenu() -> NSMenu {
        let menu = NSMenu()

        menu.addItem(NSMenuItem(title: "Open Safari Settings…",
                                action: #selector(openSafariSettings),
                                keyEquivalent: ""))

        menu.addItem(NSMenuItem(title: "About Demo Buddy…",
                                action: #selector(showOnboarding),
                                keyEquivalent: ""))

        menu.addItem(.separator())

        menu.addItem(NSMenuItem(title: "Quit Demo Buddy",
                                action: #selector(NSApplication.terminate(_:)),
                                keyEquivalent: "q"))

        return menu
    }

    // MARK: - Actions

    @objc private func openSafariSettings() {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: "dk.talktech.demo-buddy.extension") { error in
            DispatchQueue.main.async {
                if error != nil {
                    // Fallback: just open Safari
                    NSWorkspace.shared.open(URL(fileURLWithPath: "/Applications/Safari.app"))
                }
            }
        }
    }

    @objc private func showOnboarding() {
        if let wc = NSApp.windows.first(where: { $0.title == "Demo Buddy" })?.windowController {
            wc.showWindow(nil)
        } else {
            let sb = NSStoryboard(name: "Main", bundle: nil)
            let wc = sb.instantiateInitialController() as? NSWindowController
            onboardingWindowController = wc
            wc?.showWindow(nil)
        }
        NSApp.activate(ignoringOtherApps: true)
    }
}
