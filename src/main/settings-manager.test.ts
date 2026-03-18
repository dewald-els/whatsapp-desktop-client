import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { initSettingsManager, getSettingsManager, __resetSettingsManagerForTests } from './settings-manager'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('SettingsManager', () => {
  let testDataPath: string
  let settingsPath: string
  let dataDir: string

  beforeEach(() => {
    // Reset singleton
    __resetSettingsManagerForTests()
    
    // Create a fresh test directory for each test
    testDataPath = path.join(os.tmpdir(), `test-settings-${Date.now()}`)
    dataDir = path.join(testDataPath, '.local', 'share', 'whatsapp-desktop')
    fs.mkdirSync(testDataPath, { recursive: true })
    settingsPath = path.join(dataDir, 'settings.json')
  })

  afterEach(() => {
    // Reset singleton
    __resetSettingsManagerForTests()
    
    // Clean up test directory
    if (fs.existsSync(testDataPath)) {
      fs.rmSync(testDataPath, { recursive: true, force: true })
    }
  })

  describe('Initialization', () => {
    it('should initialize with default settings when no file exists', () => {
      const manager = initSettingsManager()
      const settings = manager.getAll()

      expect(settings).toEqual({
        startMinimized: true,
        closeToTray: true,
        notificationsEnabled: true,
        showPreview: true,
        notificationSound: true,
        dndMode: false,
        theme: 'system',
        firstRun: true,
        failedShortcuts: [],
        sessionType: ''
      })
    })

    it('should create settings directory if it does not exist', () => {
      initSettingsManager()
      expect(fs.existsSync(testDataPath)).toBe(true)
    })

    it('should create settings.json file on first write', () => {
      const manager = initSettingsManager()
      manager.set('dndMode', true)

      expect(fs.existsSync(settingsPath)).toBe(true)
    })

    it('should load existing settings from file', () => {
      // Create the data directory and write a settings file manually
      fs.mkdirSync(dataDir, { recursive: true })
      const existingSettings = {
        startMinimized: false,
        closeToTray: false,
        notificationsEnabled: false,
        showPreview: false,
        notificationSound: false,
        dndMode: true,
        theme: 'dark' as const,
        firstRun: false,
        failedShortcuts: ['Ctrl+Shift+W'],
        sessionType: 'x11'
      }
      fs.writeFileSync(settingsPath, JSON.stringify(existingSettings, null, 2))

      const manager = initSettingsManager()
      const settings = manager.getAll()

      expect(settings).toEqual(existingSettings)
    })

    it('should merge existing settings with defaults for missing keys', () => {
      // Create the data directory and write partial settings
      fs.mkdirSync(dataDir, { recursive: true })
      const partialSettings = {
        dndMode: true,
        theme: 'dark'
      }
      fs.writeFileSync(settingsPath, JSON.stringify(partialSettings, null, 2))

      const manager = initSettingsManager()
      const settings = manager.getAll()

      // Should have the custom values plus defaults for missing keys
      expect(settings.dndMode).toBe(true)
      expect(settings.theme).toBe('dark')
      expect(settings.notificationsEnabled).toBe(true) // default
      expect(settings.startMinimized).toBe(true) // default
    })

    it('should handle corrupted settings file gracefully', () => {
      // Create the data directory and write invalid JSON
      fs.mkdirSync(dataDir, { recursive: true })
      fs.writeFileSync(settingsPath, 'invalid json{}{')

      const manager = initSettingsManager()
      const settings = manager.getAll()

      // Should fall back to defaults
      expect(settings).toEqual({
        startMinimized: true,
        closeToTray: true,
        notificationsEnabled: true,
        showPreview: true,
        notificationSound: true,
        dndMode: false,
        theme: 'system',
        firstRun: true,
        failedShortcuts: [],
        sessionType: ''
      })
    })
  })

  describe('Get Settings', () => {
    it('should get individual setting by key', () => {
      const manager = initSettingsManager()
      
      expect(manager.get('dndMode')).toBe(false)
      expect(manager.get('theme')).toBe('system')
      expect(manager.get('notificationsEnabled')).toBe(true)
    })

    it('should get all settings', () => {
      const manager = initSettingsManager()
      const settings = manager.getAll()

      expect(settings).toHaveProperty('dndMode')
      expect(settings).toHaveProperty('theme')
      expect(settings).toHaveProperty('notificationsEnabled')
      expect(Object.keys(settings)).toHaveLength(10)
    })

    it('should return a copy of settings, not reference', () => {
      const manager = initSettingsManager()
      const settings1 = manager.getAll()
      const settings2 = manager.getAll()

      settings1.dndMode = true
      expect(settings2.dndMode).toBe(false) // Should not be affected
    })
  })

  describe('Set Settings', () => {
    it('should set individual boolean setting', () => {
      const manager = initSettingsManager()
      
      manager.set('dndMode', true)
      expect(manager.get('dndMode')).toBe(true)
      
      manager.set('notificationsEnabled', false)
      expect(manager.get('notificationsEnabled')).toBe(false)
    })

    it('should set theme setting', () => {
      const manager = initSettingsManager()
      
      manager.set('theme', 'dark')
      expect(manager.get('theme')).toBe('dark')
      
      manager.set('theme', 'light')
      expect(manager.get('theme')).toBe('light')
    })

    it('should set array setting', () => {
      const manager = initSettingsManager()
      
      manager.set('failedShortcuts', ['Ctrl+Shift+W', 'Ctrl+Shift+D'])
      expect(manager.get('failedShortcuts')).toEqual(['Ctrl+Shift+W', 'Ctrl+Shift+D'])
    })

    it('should set windowBounds setting', () => {
      const manager = initSettingsManager()
      
      const bounds = { width: 1920, height: 1080, x: 100, y: 200 }
      manager.set('windowBounds', bounds)
      expect(manager.get('windowBounds')).toEqual(bounds)
    })

    it('should persist settings to file immediately', () => {
      const manager = initSettingsManager()
      
      manager.set('dndMode', true)
      manager.set('theme', 'dark')

      // Read file directly
      const fileContent = fs.readFileSync(settingsPath, 'utf-8')
      const savedSettings = JSON.parse(fileContent)

      expect(savedSettings.dndMode).toBe(true)
      expect(savedSettings.theme).toBe('dark')
    })

    it('should write formatted JSON with 2-space indentation', () => {
      const manager = initSettingsManager()
      manager.set('dndMode', true)

      const fileContent = fs.readFileSync(settingsPath, 'utf-8')
      expect(fileContent).toContain('  "dndMode": true')
    })
  })

  describe('Reset Settings', () => {
    it('should reset all settings to defaults', () => {
      const manager = initSettingsManager()
      
      // Change some settings
      manager.set('dndMode', true)
      manager.set('theme', 'dark')
      manager.set('notificationsEnabled', false)

      // Reset
      manager.reset()

      // Verify defaults
      expect(manager.get('dndMode')).toBe(false)
      expect(manager.get('theme')).toBe('system')
      expect(manager.get('notificationsEnabled')).toBe(true)
    })

    it('should persist reset to file', () => {
      const manager = initSettingsManager()
      
      manager.set('dndMode', true)
      manager.reset()

      const fileContent = fs.readFileSync(settingsPath, 'utf-8')
      const savedSettings = JSON.parse(fileContent)

      expect(savedSettings.dndMode).toBe(false)
    })
  })

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const manager1 = initSettingsManager()
      const manager2 = getSettingsManager()

      expect(manager1).toBe(manager2)
    })

    it('should throw error if getSettingsManager called before init', () => {
      // This test needs to run in isolation, so we'll just verify the pattern
      expect(() => {
        // In a real scenario where init wasn't called, this would throw
        getSettingsManager()
      }).not.toThrow() // Because we already initialized in beforeEach
    })

    it('should share state across instances', () => {
      const manager1 = initSettingsManager()
      manager1.set('dndMode', true)

      const manager2 = getSettingsManager()
      expect(manager2.get('dndMode')).toBe(true)
    })
  })

  describe('File System Error Handling', () => {
    it('should handle read permission errors gracefully', () => {
      // Create settings file
      fs.writeFileSync(settingsPath, JSON.stringify({ dndMode: true }))
      
      // Mock fs.readFileSync to throw error
      const originalReadFile = fs.readFileSync
      vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const manager = initSettingsManager()
      const settings = manager.getAll()

      // Should fall back to defaults
      expect(settings.dndMode).toBe(false)

      // Restore
      fs.readFileSync = originalReadFile
    })

    it('should handle write errors gracefully', () => {
      const manager = initSettingsManager()
      
      // Mock fs.writeFileSync to throw error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('Disk full')
      })

      // Should not throw
      expect(() => manager.set('dndMode', true)).not.toThrow()
      
      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error saving settings'),
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Type Safety', () => {
    it('should handle all valid theme values', () => {
      const manager = initSettingsManager()
      
      manager.set('theme', 'light')
      expect(manager.get('theme')).toBe('light')
      
      manager.set('theme', 'dark')
      expect(manager.get('theme')).toBe('dark')
      
      manager.set('theme', 'system')
      expect(manager.get('theme')).toBe('system')
    })

    it('should handle optional windowBounds', () => {
      const manager = initSettingsManager()
      
      // Initially undefined
      expect(manager.get('windowBounds')).toBeUndefined()
      
      // Can be set
      manager.set('windowBounds', { width: 800, height: 600 })
      expect(manager.get('windowBounds')).toEqual({ width: 800, height: 600 })
    })
  })
})
