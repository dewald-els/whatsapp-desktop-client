import { BrowserWindow } from 'electron'
import { getAppIcon } from '../utils/theme-detector'
import { getMainWindow } from './main-window'

export function showWelcomeDialog() {
  const mainWin = getMainWindow()
  
  const welcomeWindow = new BrowserWindow({
    width: 600,
    height: 550,
    modal: true,
    parent: mainWin || undefined,
    resizable: false,
    title: 'Welcome to WhatsApp Desktop',
    icon: getAppIcon(),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  
  welcomeWindow.setMenu(null)
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 32px;
      background: #f5f5f5;
      margin: 0;
    }
    .container {
      background: white;
      padding: 32px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      margin-top: 0;
      color: #25D366;
    }
    .shortcuts {
      margin: 24px 0;
    }
    .shortcut {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #eee;
    }
    .key {
      background: #eee;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }
    button {
      background: #25D366;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      width: 100%;
      margin-top: 16px;
    }
    button:hover {
      background: #22c55e;
    }
    .feature {
      margin: 16px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to WhatsApp Desktop! 🎉</h1>
    
    <p>Your WhatsApp is now running as a native desktop application with these features:</p>
    
    <div class="feature">
      <strong>✓ System Tray Integration</strong><br>
      <small>The app runs in your system tray. Click the icon to show/hide the window.</small>
    </div>
    
    <div class="feature">
      <strong>✓ Native Notifications</strong><br>
      <small>Get desktop notifications for new messages.</small>
    </div>
    
    <div class="feature">
      <strong>✓ Global Keyboard Shortcuts</strong><br>
      <small>Quick access from anywhere:</small>
    </div>
    
    <div class="shortcuts">
      <div class="shortcut">
        <span>Focus search</span>
        <span class="key">Ctrl+K</span>
      </div>
      <div class="shortcut">
        <span>Show/hide window</span>
        <span class="key">Ctrl+Shift+W</span>
      </div>
      <div class="shortcut">
        <span>Open settings</span>
        <span class="key">Ctrl+,</span>
      </div>
      <div class="shortcut">
        <span>Toggle Do Not Disturb</span>
        <span class="key">Ctrl+Shift+D</span>
      </div>
    </div>
    
    <p><small>You can customize these settings anytime by pressing <strong>Ctrl+,</strong> or right-clicking the tray icon.</small></p>
    
    <button onclick="window.close()">
      Get Started
    </button>
  </div>
</body>
</html>
  `
  
  welcomeWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
}
