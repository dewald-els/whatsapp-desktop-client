import { globalShortcut, app } from 'electron'
import { getMainWindow, toggleMainWindow } from './windows/main-window'
import { createSettingsWindow } from './windows/settings-window'
import { toggleDND } from './tray'
import store from './store'
import { getSystemInfo } from './utils/system-info'

export function registerShortcuts() {
  const shortcuts = [
    {
      key: 'CommandOrControl+Shift+W',
      description: 'Show/hide main window',
      handler: toggleMainWindow
    },
    {
      key: 'CommandOrControl+,',
      description: 'Open settings',
      handler: () => createSettingsWindow()
    },
    {
      key: 'CommandOrControl+Shift+D',
      description: 'Toggle Do Not Disturb',
      handler: toggleDND
    }
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
  store.set('failedShortcuts', failed)
  
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
