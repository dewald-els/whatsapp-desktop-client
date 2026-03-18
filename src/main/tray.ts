import { Tray, Menu, nativeTheme, app, BrowserWindow } from 'electron'
import { getTrayIcon } from './utils/theme-detector'
import { getMainWindow, toggleMainWindow, setQuitting } from './windows/main-window'
import { createSettingsWindow } from './windows/settings-window'
import { getSettingsManager } from './settings-manager'

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
  
  const settingsManager = getSettingsManager()
  const mainWindow = getMainWindow()
  const dndEnabled = settingsManager.get('dndMode')
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: mainWindow?.isVisible() ? 'Hide WhatsApp' : 'Show WhatsApp',
      click: () => toggleMainWindow()
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
      label: 'Statistics',
      click: () => createSettingsWindow('stats')
    },
    {
      label: 'Settings',
      click: () => createSettingsWindow()
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
  const settingsManager = getSettingsManager()
  const current = settingsManager.get('dndMode')
  const newState = !current
  settingsManager.set('dndMode', newState)
  
  // Update tooltip
  if (tray && !tray.isDestroyed()) {
    const tooltip = newState ? 'WhatsApp Desktop (Do Not Disturb)' : 'WhatsApp Desktop'
    tray.setToolTip(tooltip)
  }
  
  updateTrayMenu()
  
  // Notify all renderer windows about the DND change
  BrowserWindow.getAllWindows().forEach(window => {
    window.webContents.send('dnd-changed', newState)
  })
}

export function getTray(): Tray | null {
  return tray
}
