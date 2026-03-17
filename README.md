# WhatsApp Desktop for Linux

A feature-rich WhatsApp Desktop client for Linux with native system integration, built with Electron, React 19, and shadcn/ui.

## Quick Start

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Or build and run production version
bun run build
bun run start

# Build .deb package
bun run package
```

## Features

- **System Tray Integration**: Theme-aware tray icons that adapt to light/dark system themes
- **Global Keyboard Shortcuts**: Quick access with system-wide hotkeys
- **Native Notifications**: OS-native notifications with configurable message preview
- **Do Not Disturb Mode**: Silence notifications when you need to focus
- **Auto-start on Boot**: Launch minimized to tray automatically
- **Modern Settings UI**: Beautiful settings window built with React 19 and shadcn/ui
- **Desktop Environment Agnostic**: Works on KDE Plasma, GNOME, XFCE, and other Linux DEs
- **Wayland Support**: Full support for both X11 and Wayland sessions
- **Enhanced Security**: Multiple layers of protection (see SECURITY.md)

## Security

This application implements comprehensive security measures:

- Context Isolation & Sandboxing
- Navigation Guards (WhatsApp domains only)
- Content Security Policy (CSP)
- Permission Management
- Input Sanitization & XSS Protection
- Security Event Logging
- Tracking Blockers (Facebook/Google Analytics)

**Security Score: 8.5/10**

For complete security documentation, see [SECURITY.md](SECURITY.md)

To run security tests:
```bash
./test-security.sh
```

For security status report:
```bash
./security-report.sh
```

## Installation

### From .deb Package (Debian/Ubuntu)

1. Download the latest `.deb` package from releases
2. Install with:
   ```bash
   sudo dpkg -i whatsapp-desktop_1.0.0_amd64.deb
   ```
3. If there are dependency issues:
   ```bash
   sudo apt-get install -f
   ```

### From .rpm Package (Fedora/RHEL/openSUSE)

1. Download the latest `.rpm` package from releases
2. Install with:
   
   **Fedora/RHEL:**
   ```bash
   sudo dnf install whatsapp-desktop-1.0.0.x86_64.rpm
   ```
   
   **openSUSE:**
   ```bash
   sudo zypper install whatsapp-desktop-1.0.0.x86_64.rpm
   ```

### From Source

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd whatsapp-desktop
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Build the application:
   ```bash
   bun run build
   ```

4. Package as .deb or .rpm:
   ```bash
   # Build both .deb and .rpm
   bun run package
   
   # Or build specific format
   bun run package:deb
   bun run package:rpm
   ```
   The packages will be in the `release/` directory.

## Development

### Prerequisites

- [Bun](https://bun.sh/) (JavaScript runtime and package manager)
- Node.js 18+ (for Electron)
- Linux with X11 or Wayland

### Running in Development Mode

```bash
bun run dev
```

This will:
1. Start the Vite dev server for the React settings UI
2. Compile the TypeScript main process
3. Launch Electron with hot-reload enabled

### Building

```bash
# Build both main and renderer processes
bun run build

# Build only main process (TypeScript compilation)
bun run build:main

# Build only renderer process (React app via Vite)
bun run build:renderer
```

### Project Structure

```
whatsapp-desktop/
├── src/
│   ├── main/              # Electron main process
│   │   ├── main.ts        # Entry point
│   │   ├── store.ts       # Settings persistence
│   │   ├── tray.ts        # System tray
│   │   ├── shortcuts.ts   # Global shortcuts
│   │   ├── ipc-handlers.ts # IPC communication
│   │   ├── windows/       # Window management
│   │   └── utils/         # Utilities
│   ├── preload/           # Preload scripts (security bridge)
│   │   ├── main-preload.ts      # WhatsApp window bridge
│   │   └── settings-preload.ts  # Settings window bridge
│   └── renderer/          # React settings UI
│       └── src/
│           ├── App.tsx    # Main app component
│           ├── components/ # React components
│           └── lib/       # Utilities & hooks
├── assets/                # App icons
├── dist/                  # Compiled output
└── release/               # .deb packages
```

## Usage

### Keyboard Shortcuts

| Shortcut | Action | Scope |
|----------|--------|-------|
| `Alt+K` | Focus WhatsApp search | Native WhatsApp Web shortcut |
| `Ctrl+Shift+W` | Toggle show/hide WhatsApp window | Global |
| `Ctrl+,` | Open settings | Global |
| `Ctrl+Shift+D` | Toggle Do Not Disturb mode | Global |

### System Tray

Right-click the system tray icon to access:
- Show/Hide WhatsApp window
- Toggle Do Not Disturb mode
- Open Settings
- Quit application

### Settings

Access settings via:
- Tray menu > Settings
- Keyboard shortcut: `Ctrl+,`

#### General Settings
- **Auto-start on boot**: Launch WhatsApp Desktop automatically when you log in
- **Close to tray**: Keep app running in tray when window is closed

#### Notifications
- **Enable notifications**: Toggle all notifications on/off
- **Show message preview**: Display message content in notifications (default: enabled)
- **Notification sound**: Play sound with notifications (uses system default)
- **Do Not Disturb**: Silence all notifications temporarily

#### Shortcuts
View all available keyboard shortcuts and their current status.

#### Appearance
Choose between Light, Dark, or System theme (affects settings window only).

## Technical Details

### Stack

- **Runtime**: Electron 41 (Chromium + Node.js)
- **Package Manager**: Bun
- **Frontend**: React 19 with TypeScript
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS v3
- **Build Tool**: Vite 8
- **Packaging**: electron-builder

### Security

- **Context Isolation**: Enabled for all windows
- **Node Integration**: Disabled in renderer processes
- **Preload Scripts**: Used for secure IPC communication
- **Session Persistence**: WhatsApp Web session stored locally

### Platform Support

- **Primary Target**: Linux (all distributions)
- **Desktop Environments**: KDE Plasma, GNOME, XFCE, etc.
- **Display Servers**: X11 and Wayland
- **Architecture**: x64 (amd64)

## Troubleshooting

### Global Shortcuts Not Working on Wayland

The app automatically detects Wayland and enables the GlobalShortcutsPortal feature. If shortcuts still don't work:

1. Ensure your DE has the XDG Desktop Portal installed
2. Check that `xdg-desktop-portal` service is running:
   ```bash
   systemctl --user status xdg-desktop-portal
   ```

### Tray Icon Not Showing

Some desktop environments require additional configuration:
- **GNOME**: Install the AppIndicator extension
- **KDE Plasma**: Should work out of the box
- **XFCE**: Ensure system tray plugin is enabled

### App Won't Start

1. Check if another instance is running:
   ```bash
   pkill -f whatsapp-desktop
   ```
2. Check the logs:
   ```bash
   journalctl --user -xe | grep whatsapp
   ```

## License

MIT License - See LICENSE file for details.

## Disclaimer

This is an unofficial WhatsApp Desktop client. WhatsApp is a trademark of Meta Platforms, Inc. This project is for personal use only and is not affiliated with or endorsed by WhatsApp or Meta.
