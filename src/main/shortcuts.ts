import { app, globalShortcut } from 'electron'
import { getSettingsManager } from './settings-manager'
import { toggleDND } from './tray'
import { getSystemInfo } from './utils/system-info'
import { toggleMainWindow } from './windows/main-window'
import { createSettingsWindow } from './windows/settings-window'

export function registerShortcuts() {
  const settingsManager = getSettingsManager()

  const shortcuts = [
    {
      key: 'CommandOrControl+Shift+W',
      description: 'Show/hide main window',
      handler: toggleMainWindow,
    },
    {
      key: 'CommandOrControl+Shift+D',
      description: 'Toggle Do Not Disturb',
      handler: toggleDND,
    },
    {
      key: 'CommandOrControl+,',
      description: 'Open settings',
      handler: () => {
        createSettingsWindow()
      },
    },
  ]

  const failed: string[] = []

  shortcuts.forEach(({ key, handler }) => {
    const success = globalShortcut.register(key, handler)
    if (!success) {
      console.error(`Failed to register shortcut: ${key}`)
      failed.push(key)
    } else {
      console.log(`Registered shortcut: ${key}`)
    }
  })

  // Store failed shortcuts for display in settings
  settingsManager.set('failedShortcuts', failed)

  // Log Wayland warning if applicable
  const systemInfo = getSystemInfo()
  if (systemInfo.isWayland && failed.length > 0) {
    console.warn('Wayland detected - some global shortcuts may not work')
  }

  // Register cleanup handler for app quit
  app.on('will-quit', () => {
    unregisterShortcuts()
  })
}

export function unregisterShortcuts() {
  globalShortcut.unregisterAll()
}
