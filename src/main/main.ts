import { app, BrowserWindow } from 'electron'
import { createMainWindow, getMainWindow } from './windows/main-window'
import { showWelcomeDialog } from './windows/welcome-dialog'
import { createTray } from './tray'
import { registerShortcuts } from './shortcuts'
import { registerIpcHandlers } from './ipc-handlers'
import { initStatsManager, getStatsManager } from './stats'
import { initSettingsManager, getSettingsManager } from './settings-manager'
import { getSystemInfo } from './utils/system-info'
import { startOSDndMonitoring } from './utils/dnd-detector'

// Enable Wayland support for global shortcuts if needed
const systemInfo = getSystemInfo()
if (systemInfo.isWayland) {
  app.commandLine.appendSwitch('enable-features', 'GlobalShortcutsPortal')
  // Disable color management features that may not be supported by all Wayland compositors
  app.commandLine.appendSwitch('disable-features', 'WaylandColorManagement')
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
    // Initialize settings manager
    const settingsManager = initSettingsManager()
    
    // Initialize stats manager
    const statsManager = initStatsManager()
    statsManager.trackAppLaunch()
    
    // Register IPC handlers
    registerIpcHandlers()
    
    // Create main window
    createMainWindow()
    
    // Create system tray
    createTray()
    
    // Register global shortcuts
    registerShortcuts()
    
    // Start monitoring OS DND status (Linux only)
    if (process.platform === 'linux') {
      startOSDndMonitoring()
    }
    
    // Show welcome dialog on first run
    if (settingsManager.get('firstRun')) {
      showWelcomeDialog()
      settingsManager.set('firstRun', false)
    }
    
    // Determine if window should be shown
    const mainWindow = getMainWindow()
    if (mainWindow) {
      // Track window focus events
      mainWindow.on('focus', () => {
        try {
          const statsManager = getStatsManager()
          statsManager.trackWindowFocus()
        } catch (error) {
          console.error('Failed to track window focus:', error)
        }
      })
      
      // Track sessions
      mainWindow.webContents.on('did-finish-load', () => {
        try {
          const statsManager = getStatsManager()
          statsManager.startSession()
        } catch (error) {
          console.error('Failed to start session:', error)
        }
      })
      
      if (startHidden || settingsManager.get('startMinimized')) {
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
  // End session before quitting
  try {
    const statsManager = getStatsManager()
    statsManager.endSession()
  } catch (error) {
    console.error('Failed to end session:', error)
  }
  
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
