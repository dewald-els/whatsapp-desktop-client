import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export interface DailyStats {
  date: string // YYYY-MM-DD format
  sessionCount: number
  totalSessionDuration: number // in seconds
  windowFocusCount: number
  notificationsSent: number
  settingsOpened: number
  dndToggleCount: number
}

export interface UsageStats {
  totalSessions: number
  totalUsageTime: number // in seconds
  totalNotifications: number
  appStartCount: number
  lastLaunch: string // ISO timestamp
  dailyStats: DailyStats[]
}

class StatsManager {
  private statsPath: string
  private stats: UsageStats
  private currentSessionStart: number | null = null
  private currentDayKey: string = ''

  constructor() {
    // Use OS-specific data directories
    // Linux: ~/.local/share/whatsapp-desktop/
    // macOS: ~/Library/Application Support/whatsapp-desktop/
    // Windows: %APPDATA%/whatsapp-desktop/
    const dataPath = process.platform === 'linux' 
      ? path.join(app.getPath('home'), '.local', 'share', 'whatsapp-desktop')
      : app.getPath('userData')
    
    // Ensure directory exists
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true })
    }
    
    this.statsPath = path.join(dataPath, 'usage-stats.json')
    this.stats = this.loadStats()
    this.currentDayKey = this.getTodayKey()
  }

  private getTodayKey(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }

  private loadStats(): UsageStats {
    try {
      if (fs.existsSync(this.statsPath)) {
        const data = fs.readFileSync(this.statsPath, 'utf-8')
        return JSON.parse(data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }

    // Return default stats if file doesn't exist or error occurred
    return {
      totalSessions: 0,
      totalUsageTime: 0,
      totalNotifications: 0,
      appStartCount: 0,
      lastLaunch: new Date().toISOString(),
      dailyStats: []
    }
  }

  private saveStats(): void {
    try {
      fs.writeFileSync(this.statsPath, JSON.stringify(this.stats, null, 2), 'utf-8')
    } catch (error) {
      console.error('Error saving stats:', error)
    }
  }

  private getTodayStats(): DailyStats {
    const todayKey = this.getTodayKey()
    let todayStats = this.stats.dailyStats.find(s => s.date === todayKey)
    
    if (!todayStats) {
      todayStats = {
        date: todayKey,
        sessionCount: 0,
        totalSessionDuration: 0,
        windowFocusCount: 0,
        notificationsSent: 0,
        settingsOpened: 0,
        dndToggleCount: 0
      }
      this.stats.dailyStats.push(todayStats)
      
      // Keep only last 90 days
      if (this.stats.dailyStats.length > 90) {
        this.stats.dailyStats = this.stats.dailyStats.slice(-90)
      }
    }
    
    return todayStats
  }

  // Track app launch
  trackAppLaunch(): void {
    this.stats.appStartCount++
    this.stats.lastLaunch = new Date().toISOString()
    this.saveStats()
  }

  // Track session start
  startSession(): void {
    this.currentSessionStart = Date.now()
    this.stats.totalSessions++
    
    const todayStats = this.getTodayStats()
    todayStats.sessionCount++
    
    this.saveStats()
  }

  // Track session end
  endSession(): void {
    if (this.currentSessionStart) {
      const duration = Math.floor((Date.now() - this.currentSessionStart) / 1000)
      this.stats.totalUsageTime += duration
      
      const todayStats = this.getTodayStats()
      todayStats.totalSessionDuration += duration
      
      this.currentSessionStart = null
      this.saveStats()
    }
  }

  // Track window focus
  trackWindowFocus(): void {
    const todayStats = this.getTodayStats()
    todayStats.windowFocusCount++
    this.saveStats()
  }

  // Track notification
  trackNotification(): void {
    this.stats.totalNotifications++
    
    const todayStats = this.getTodayStats()
    todayStats.notificationsSent++
    
    this.saveStats()
  }

  // Track settings opened
  trackSettingsOpened(): void {
    const todayStats = this.getTodayStats()
    todayStats.settingsOpened++
    this.saveStats()
  }

  // Track DND toggle
  trackDndToggle(): void {
    const todayStats = this.getTodayStats()
    todayStats.dndToggleCount++
    this.saveStats()
  }

  // Get all stats
  getStats(): UsageStats {
    return { ...this.stats }
  }

  // Get stats for last N days
  getRecentStats(days: number = 30): DailyStats[] {
    return this.stats.dailyStats.slice(-days)
  }

  // Reset all stats
  resetStats(): void {
    this.stats = {
      totalSessions: 0,
      totalUsageTime: 0,
      totalNotifications: 0,
      appStartCount: 0,
      lastLaunch: new Date().toISOString(),
      dailyStats: []
    }
    this.saveStats()
  }
}

// Singleton instance
let statsManager: StatsManager | null = null

export function initStatsManager(): StatsManager {
  if (!statsManager) {
    statsManager = new StatsManager()
  }
  return statsManager
}

export function getStatsManager(): StatsManager {
  if (!statsManager) {
    throw new Error('StatsManager not initialized. Call initStatsManager() first.')
  }
  return statsManager
}
