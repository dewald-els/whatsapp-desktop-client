import Store from 'electron-store'

export interface StoreSchema {
  // Window state
  windowBounds: {
    x: number
    y: number
    width: number
    height: number
  }
  
  // General settings
  startMinimized: boolean
  closeToTray: boolean
  firstRun: boolean
  
  // Notification settings
  notificationsEnabled: boolean
  notificationSound: boolean
  showPreview: boolean
  dndMode: boolean
  
  // Appearance
  theme: 'light' | 'dark' | 'system'
  
  // Internal/diagnostic
  failedShortcuts: string[]
  sessionType: string
  electronVersion: string
}

const store = new Store<StoreSchema>({
  name: 'whatsapp-desktop-config',
  defaults: {
    windowBounds: {
      x: 0,
      y: 0,
      width: 1200,
      height: 800
    },
    startMinimized: true,
    closeToTray: true,
    firstRun: true,
    notificationsEnabled: true,
    notificationSound: true,
    showPreview: true,
    dndMode: false,
    theme: 'system',
    failedShortcuts: [],
    sessionType: process.env.XDG_SESSION_TYPE || 'unknown',
    electronVersion: process.versions.electron
  }
}) as any

export default store
