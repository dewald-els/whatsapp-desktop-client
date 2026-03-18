import { BrowserWindow } from 'electron'
import path from 'path'
import { getAppIcon } from '../utils/theme-detector'
import { getMainWindow } from './main-window'
import { getStatsManager } from '../stats'

let settingsWindow: BrowserWindow | null = null

export function createSettingsWindow(initialTab?: string): BrowserWindow {
  // Track settings opened
  try {
    const statsManager = getStatsManager()
    statsManager.trackSettingsOpened()
  } catch (error) {
    console.error('Failed to track settings opened:', error)
  }
  
  if (settingsWindow) {
    settingsWindow.show()
    settingsWindow.focus()
    // Navigate to specific tab if requested
    if (initialTab) {
      settingsWindow.webContents.send('navigate-to-tab', initialTab)
    }
    return settingsWindow
  }
  
  const mainWin = getMainWindow()
  
  settingsWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'WhatsApp Desktop - Settings',
    icon: getAppIcon(),
    modal: false,
    parent: mainWin || undefined,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, '../../preload/settings-preload.js')
    }
  })
  
  // Remove menu completely
  settingsWindow.removeMenu()
  
  // Security: Prevent navigation in settings window
  settingsWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    // Only allow localhost in dev mode or file:// protocol
    const isDev = process.argv.includes('--dev')
    const parsedUrl = new URL(navigationUrl)
    
    const isAllowed = 
      (isDev && parsedUrl.hostname === 'localhost') ||
      parsedUrl.protocol === 'file:'
    
    if (!isAllowed) {
      console.warn('Navigation blocked in settings:', navigationUrl)
      event.preventDefault()
    }
  })
  
  // Security: Prevent opening new windows from settings
  settingsWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })
  
  // Development: Load Vite dev server
  if (process.argv.includes('--dev')) {
    settingsWindow.loadURL('http://localhost:5173')
    // Open DevTools in development
    settingsWindow.webContents.openDevTools()
  } else {
    // Production: Load bundled HTML
    settingsWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
  
  // Navigate to specific tab after load if requested
  if (initialTab) {
    settingsWindow.webContents.once('did-finish-load', () => {
      settingsWindow?.webContents.send('navigate-to-tab', initialTab)
    })
  }
  
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
  
  return settingsWindow
}

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow
}
