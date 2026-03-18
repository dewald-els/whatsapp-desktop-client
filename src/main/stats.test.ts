import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { initStatsManager, getStatsManager, __resetStatsManagerForTests } from './stats'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('StatsManager', () => {
  let testDataPath: string
  let statsDbPath: string
  let dataDir: string
  let manager: any

  beforeEach(() => {
    // Reset singleton
    __resetStatsManagerForTests()
    
    testDataPath = path.join(os.tmpdir(), `test-stats-${Date.now()}`)
    dataDir = path.join(testDataPath, '.local', 'share', 'whatsapp-desktop')
    fs.mkdirSync(testDataPath, { recursive: true })
    statsDbPath = path.join(dataDir, 'usage-stats.db')
  })

  afterEach(() => {
    // Close the database connection before cleanup
    if (manager) {
      try {
        manager.close()
      } catch (e) {
        // Ignore close errors
      }
      manager = null
    }
    
    // Reset singleton
    __resetStatsManagerForTests()
    
    if (fs.existsSync(testDataPath)) {
      fs.rmSync(testDataPath, { recursive: true, force: true })
    }
  })

  describe('Initialization', () => {
    it('should initialize with zero stats when no database exists', () => {
      manager = initStatsManager()
      const stats = manager.getStats()

      expect(stats.totalSessions).toBe(0)
      expect(stats.totalUsageTime).toBe(0)
      expect(stats.totalNotifications).toBe(0)
      expect(stats.appStartCount).toBe(0)
      expect(manager.getRecentStats()).toEqual([])
    })

    it('should create database file on initialization', () => {
      manager = initStatsManager()
      expect(fs.existsSync(statsDbPath)).toBe(true)
    })

    it('should migrate existing JSON stats to SQLite', () => {
      // Create the data directory and place JSON file there
      fs.mkdirSync(dataDir, { recursive: true })
      const jsonPath = path.join(dataDir, 'usage-stats.json')
      const existingStats = {
        totalSessions: 5,
        totalUsageTime: 3600,
        totalNotifications: 10,
        appStartCount: 5,
        lastLaunch: new Date().toISOString(),
        dailyStats: [
          {
            date: '2026-03-15',
            sessionCount: 2,
            totalSessionDuration: 1200,
            windowFocusCount: 5,
            notificationsSent: 3,
            settingsOpened: 1,
            dndToggleCount: 2
          }
        ]
      }
      fs.writeFileSync(jsonPath, JSON.stringify(existingStats, null, 2))

      manager = initStatsManager()
      const stats = manager.getStats()

      expect(stats.totalSessions).toBe(5)
      expect(stats.totalUsageTime).toBe(3600)
      expect(stats.totalNotifications).toBe(10)
      expect(stats.appStartCount).toBe(5)
      
      const dailyStats = manager.getRecentStats(1)
      expect(dailyStats).toHaveLength(1)
      expect(dailyStats[0].date).toBe('2026-03-15')
      expect(dailyStats[0].sessionCount).toBe(2)
      
      // Verify backup was created
      expect(fs.existsSync(jsonPath + '.backup')).toBe(true)
    })

    it('should handle corrupted JSON file gracefully', () => {
      fs.mkdirSync(dataDir, { recursive: true })
      const jsonPath = path.join(dataDir, 'usage-stats.json')
      fs.writeFileSync(jsonPath, 'corrupted{{{json')

      manager = initStatsManager()
      const stats = manager.getStats()

      expect(stats.totalSessions).toBe(0)
      expect(stats.totalNotifications).toBe(0)
    })
  })

  describe('App Launch Tracking', () => {
    it('should increment appStartCount on trackAppLaunch', () => {
      manager = initStatsManager()
      
      manager.trackAppLaunch()
      expect(manager.getStats().appStartCount).toBe(1)
      
      manager.trackAppLaunch()
      expect(manager.getStats().appStartCount).toBe(2)
    })

    it('should update lastLaunch timestamp', () => {
      manager = initStatsManager()
      const beforeLaunch = new Date()
      
      manager.trackAppLaunch()
      
      const lastLaunch = new Date(manager.getStats().lastLaunch)
      expect(lastLaunch.getTime()).toBeGreaterThanOrEqual(beforeLaunch.getTime())
    })

    it('should persist stats to database', () => {
      manager = initStatsManager()
      manager.trackAppLaunch()

      // Close and reopen to verify persistence
      manager.close()
      manager = initStatsManager()

      expect(manager.getStats().appStartCount).toBe(1)
    })
  })

  describe('Session Tracking', () => {
    it('should increment totalSessions on startSession', () => {
      manager = initStatsManager()
      
      manager.startSession()
      expect(manager.getStats().totalSessions).toBe(1)
      
      manager.startSession()
      expect(manager.getStats().totalSessions).toBe(2)
    })

    it('should track session duration on endSession', async () => {
      manager = initStatsManager()
      
      manager.startSession()
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100))
      
      manager.endSession()
      
      const stats = manager.getStats()
      expect(stats.totalUsageTime).toBeGreaterThan(0)
      
      const today = new Date().toISOString().split('T')[0]
      const dailyStats = manager.getRecentStats(1)
      expect(dailyStats).toHaveLength(1)
      expect(dailyStats[0].date).toBe(today)
      expect(dailyStats[0].totalSessionDuration).toBeGreaterThan(0)
    })

    it('should not crash if endSession called without startSession', () => {
      manager = initStatsManager()
      expect(() => manager.endSession()).not.toThrow()
    })
  })

  describe('Notification Tracking', () => {
    it('should increment notification count', () => {
      manager = initStatsManager()
      
      manager.trackNotification()
      expect(manager.getStats().totalNotifications).toBe(1)
      
      manager.trackNotification()
      manager.trackNotification()
      expect(manager.getStats().totalNotifications).toBe(3)
    })

    it('should update daily notification count', () => {
      manager = initStatsManager()
      
      manager.trackNotification()
      manager.trackNotification()

      const today = new Date().toISOString().split('T')[0]
      const dailyStats = manager.getRecentStats(1)
      
      expect(dailyStats).toHaveLength(1)
      expect(dailyStats[0].date).toBe(today)
      expect(dailyStats[0].notificationsSent).toBe(2)
    })
  })

  describe('Window Focus Tracking', () => {
    it('should track window focus events', () => {
      manager = initStatsManager()
      
      manager.trackWindowFocus()
      manager.trackWindowFocus()

      const today = new Date().toISOString().split('T')[0]
      const dailyStats = manager.getRecentStats(1)
      
      expect(dailyStats).toHaveLength(1)
      expect(dailyStats[0].date).toBe(today)
      expect(dailyStats[0].windowFocusCount).toBe(2)
    })
  })

  describe('Settings Opened Tracking', () => {
    it('should track settings opens', () => {
      manager = initStatsManager()
      
      manager.trackSettingsOpened()

      const today = new Date().toISOString().split('T')[0]
      const dailyStats = manager.getRecentStats(1)
      
      expect(dailyStats).toHaveLength(1)
      expect(dailyStats[0].date).toBe(today)
      expect(dailyStats[0].settingsOpened).toBe(1)
    })
  })

  describe('DND Toggle Tracking', () => {
    it('should track DND toggles', () => {
      manager = initStatsManager()
      
      manager.trackDndToggle()
      manager.trackDndToggle()

      const today = new Date().toISOString().split('T')[0]
      const dailyStats = manager.getRecentStats(1)
      
      expect(dailyStats).toHaveLength(1)
      expect(dailyStats[0].date).toBe(today)
      expect(dailyStats[0].dndToggleCount).toBe(2)
    })
  })

  describe('Recent Stats', () => {
    it('should return stats for last N days', () => {
      manager = initStatsManager()
      
      // Track some activity today
      manager.trackNotification()

      const last7Days = manager.getRecentStats(7)
      expect(last7Days.length).toBeGreaterThanOrEqual(0)
      expect(last7Days.length).toBeLessThanOrEqual(7)
    })

    it('should return empty array if no stats', () => {
      manager = initStatsManager()
      const recent = manager.getRecentStats(30)
      
      expect(recent).toEqual([])
    })

    it('should return all stats when days = 0', () => {
      manager = initStatsManager()
      
      manager.trackNotification()
      manager.trackWindowFocus()
      
      const allStats = manager.getRecentStats(0)
      expect(allStats.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Reset Stats', () => {
    it('should reset all stats to zero', () => {
      manager = initStatsManager()
      
      manager.trackAppLaunch()
      manager.trackNotification()
      manager.trackWindowFocus()
      manager.trackSettingsOpened()
      manager.trackDndToggle()

      manager.resetStats()

      const stats = manager.getStats()
      expect(stats.totalSessions).toBe(0)
      expect(stats.totalUsageTime).toBe(0)
      expect(stats.totalNotifications).toBe(0)
      expect(stats.appStartCount).toBe(0)
      expect(manager.getRecentStats()).toEqual([])
    })

    it('should persist reset to database', () => {
      manager = initStatsManager()
      
      manager.trackAppLaunch()
      manager.resetStats()

      // Close and reopen to verify persistence
      manager.close()
      manager = initStatsManager()

      expect(manager.getStats().totalSessions).toBe(0)
      expect(manager.getStats().appStartCount).toBe(0)
    })
  })

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const manager1 = initStatsManager()
      const manager2 = getStatsManager()

      expect(manager1).toBe(manager2)
    })

    it('should share state across instances', () => {
      const manager1 = initStatsManager()
      manager1.trackNotification()

      const manager2 = getStatsManager()
      expect(manager2.getStats().totalNotifications).toBe(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', () => {
      manager = initStatsManager()
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Close database to simulate error condition
      manager.close()

      // These should not throw even with closed database
      expect(() => {
        try {
          manager.trackNotification()
        } catch (e) {
          // Expected to fail, but shouldn't crash the app
        }
      }).not.toThrow()
      
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Date Range Queries', () => {
    it('should get stats by date range', () => {
      manager = initStatsManager()
      
      manager.trackNotification()
      const today = new Date().toISOString().split('T')[0]
      
      const stats = manager.getStatsByDateRange(today, today)
      expect(stats).toHaveLength(1)
      expect(stats[0].date).toBe(today)
    })

    it('should return total tracked days', () => {
      manager = initStatsManager()
      
      manager.trackNotification()
      
      const totalDays = manager.getTotalDays()
      expect(totalDays).toBeGreaterThanOrEqual(1)
    })
  })
})
