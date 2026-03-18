import * as fs from 'node:fs'
import * as path from 'node:path'
import { app } from 'electron'

export interface Settings {
  // General
  startMinimized: boolean
  closeToTray: boolean

  // Notifications
  notificationsEnabled: boolean
  showPreview: boolean
  notificationSound: boolean
  dndMode: boolean

  // Appearance
  theme: 'light' | 'dark' | 'system'

  // Internal
  firstRun: boolean
  failedShortcuts: string[]
  sessionType: string
  windowBounds?: {
    width: number
    height: number
    x?: number
    y?: number
  }
}

const DEFAULT_SETTINGS: Settings = {
  startMinimized: true,
  closeToTray: true,
  notificationsEnabled: true,
  showPreview: true,
  notificationSound: true,
  dndMode: false,
  theme: 'system',
  firstRun: true,
  failedShortcuts: [],
  sessionType: '',
}

class SettingsManager {
  private settingsPath: string
  private settings: Settings

  constructor() {
    // Use OS-specific data directories
    const dataPath =
      process.platform === 'linux'
        ? path.join(app.getPath('home'), '.local', 'share', 'whatsapp-desktop')
        : app.getPath('userData')

    // Ensure directory exists
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true })
    }

    this.settingsPath = path.join(dataPath, 'settings.json')
    this.settings = this.loadSettings()
  }

  private loadSettings(): Settings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf-8')
        const loaded = JSON.parse(data)
        // Merge with defaults to ensure all keys exist
        return { ...DEFAULT_SETTINGS, ...loaded }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }

    // Return default settings if file doesn't exist or error occurred
    return { ...DEFAULT_SETTINGS }
  }

  private saveSettings(): void {
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8')
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  get<K extends keyof Settings>(key: K): Settings[K] {
    return this.settings[key]
  }

  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.settings[key] = value
    this.saveSettings()
  }

  getAll(): Settings {
    return { ...this.settings }
  }

  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS }
    this.saveSettings()
  }
}

// Singleton instance
let settingsManager: SettingsManager | null = null

export function initSettingsManager(): SettingsManager {
  if (!settingsManager) {
    settingsManager = new SettingsManager()
  }
  return settingsManager
}

export function getSettingsManager(): SettingsManager {
  if (!settingsManager) {
    throw new Error('SettingsManager not initialized. Call initSettingsManager() first.')
  }
  return settingsManager
}

// For testing only - reset the singleton
export function __resetSettingsManagerForTests(): void {
  settingsManager = null
}
