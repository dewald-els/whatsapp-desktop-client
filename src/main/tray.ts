import { Tray, Menu, nativeTheme, app } from 'electron'
import { getTrayIcon } from './utils/theme-detector'
import { getMainWindow, toggleMainWindow, setQuitting } from './windows/main-window'
import { createSettingsWindow } from './windows/settings-window'
import store from './store'

let tray: Tray | null = null

export function createTray() {
  tray = new Tray(getTrayIcon())
  tray.setToolTip('WhatsApp Desktop')
  
  // Update icon when system theme changes
  nativeTheme.on('updated', () => {
    if (tray && !tray.isDestroyed()) {
      tray.setImage(getTrayIcon())
    }
  })
  
  updateTrayMenu()
  
  // Click handler - toggle window visibility
  tray.on('click', () => {
    toggleMainWindow()
  })
  
  return tray
}

export function updateTrayMenu() {
  if (!tray || tray.isDestroyed()) return
  
  const mainWindow = getMainWindow()
  const dndEnabled = store.get('dndMode', false)
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: mainWindow?.isVisible() ? 'Hide WhatsApp' : 'Show WhatsApp',
      click: () => toggleMainWindow()
    },
    {
      label: 'Settings',
      accelerator: 'Ctrl+,',
      click: () => createSettingsWindow()
    },
    { type: 'separator' },
    {
      label: 'Do Not Disturb',
      type: 'checkbox',
      checked: dndEnabled,
      click: () => toggleDND()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        setQuitting(true)
        app.quit()
      }
    }
  ])
  
  tray.setContextMenu(contextMenu)
}

export function toggleDND() {
  const current = store.get('dndMode', false)
  const newState = !current
  store.set('dndMode', newState)
  
  // Update tooltip
  if (tray && !tray.isDestroyed()) {
    const tooltip = newState ? 'WhatsApp Desktop (Do Not Disturb)' : 'WhatsApp Desktop'
    tray.setToolTip(tooltip)
  }
  
  updateTrayMenu()
  
  // Notify settings window if open
  const { getSettingsWindow } = require('./windows/settings-window')
  const settingsWindow = getSettingsWindow()
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('dnd-changed', newState)
  }
}

export function getTray(): Tray | null {
  return tray
}
