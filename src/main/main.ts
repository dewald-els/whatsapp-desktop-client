import { app, BrowserWindow } from 'electron'
import { createMainWindow, getMainWindow } from './windows/main-window'
import { showWelcomeDialog } from './windows/welcome-dialog'
import { createTray } from './tray'
import { registerShortcuts } from './shortcuts'
import { registerIpcHandlers } from './ipc-handlers'
import store from './store'
import { getSystemInfo } from './utils/system-info'

// Enable Wayland support for global shortcuts if needed
const systemInfo = getSystemInfo()
if (systemInfo.isWayland) {
  app.commandLine.appendSwitch('enable-features', 'GlobalShortcutsPortal')
  console.log('Wayland detected - enabled GlobalShortcutsPortal')
}

// Handle --hidden flag from autostart
const args = process.argv.slice(1)
const startHidden = args.includes('--hidden')

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window
    const mainWindow = getMainWindow()
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
  
  app.whenReady().then(() => {
    // Register IPC handlers
    registerIpcHandlers()
    
    // Create main window
    createMainWindow()
    
    // Create system tray
    createTray()
    
    // Register global shortcuts
    registerShortcuts()
    
    // Show welcome dialog on first run
    if (store.get('firstRun', true)) {
      showWelcomeDialog()
      store.set('firstRun', false)
    }
    
    // Determine if window should be shown
    const mainWindow = getMainWindow()
    if (mainWindow) {
      if (startHidden || store.get('startMinimized', true)) {
        // Start hidden in tray
        mainWindow.hide()
      } else {
        // Show window
        mainWindow.show()
      }
    }
  })
}

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})
