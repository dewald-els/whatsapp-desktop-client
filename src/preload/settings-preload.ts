import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('settingsAPI', {
  // Get all settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  
  // Set individual setting
  setSetting: (key: string, value: any) => 
    ipcRenderer.invoke('set-setting', key, value),
  
  // Auto-start management
  getAutostart: () => ipcRenderer.invoke('get-autostart'),
  setAutostart: (enabled: boolean) => 
    ipcRenderer.invoke('set-autostart', enabled),
  
  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  // Listen for DND changes
  onDndChanged: (callback: (enabled: boolean) => void) => {
    ipcRenderer.on('dnd-changed', (event, enabled) => {
      callback(enabled)
    })
  }
})
