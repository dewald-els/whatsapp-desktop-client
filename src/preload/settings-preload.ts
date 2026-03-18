import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('settingsAPI', {
  // Get all settings
  getSettings: () => ipcRenderer.invoke('get-settings'),

  // Set individual setting
  setSetting: (key: string, value: any) => ipcRenderer.invoke('set-setting', key, value),

  // Auto-start management
  getAutostart: () => ipcRenderer.invoke('get-autostart'),
  setAutostart: (enabled: boolean) => ipcRenderer.invoke('set-autostart', enabled),

  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Statistics
  getStats: () => ipcRenderer.invoke('get-stats'),
  getRecentStats: (days: number) => ipcRenderer.invoke('get-recent-stats', days),
  resetStats: () => ipcRenderer.invoke('reset-stats'),

  // Listen for DND changes
  onDndChanged: (callback: (enabled: boolean) => void) => {
    const listener = (_event: any, enabled: boolean) => {
      callback(enabled)
    }
    ipcRenderer.on('dnd-changed', listener)
    return () => ipcRenderer.removeListener('dnd-changed', listener)
  },

  // Listen for tab navigation
  onNavigateToTab: (callback: (tab: string) => void) => {
    ipcRenderer.on('navigate-to-tab', (_event, tab) => {
      callback(tab)
    })
  },
})
