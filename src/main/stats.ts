import { app } from 'electron'
import Database from 'better-sqlite3'
import * as path from 'path'
import * as fs from 'fs'

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
}

class StatsManager {
  private db: Database.Database
  private currentSessionStart: number | null = null

  constructor() {
    // Use OS-specific data directories
    const dataPath = process.platform === 'linux' 
      ? path.join(app.getPath('home'), '.local', 'share', 'whatsapp-desktop')
      : app.getPath('userData')
    
    // Ensure directory exists
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true })
    }
    
    const dbPath = path.join(dataPath, 'usage-stats.db')
    this.db = new Database(dbPath)
    
    this.initDatabase()
    this.migrateFromJSON(dataPath)
  }

  private initDatabase(): void {
    // Create summary table for overall stats
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS summary (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        totalSessions INTEGER DEFAULT 0,
        totalUsageTime INTEGER DEFAULT 0,
        totalNotifications INTEGER DEFAULT 0,
        appStartCount INTEGER DEFAULT 0,
        lastLaunch TEXT
      )
    `)

    // Create daily_stats table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS daily_stats (
        date TEXT PRIMARY KEY,
        sessionCount INTEGER DEFAULT 0,
        totalSessionDuration INTEGER DEFAULT 0,
        windowFocusCount INTEGER DEFAULT 0,
        notificationsSent INTEGER DEFAULT 0,
        settingsOpened INTEGER DEFAULT 0,
        dndToggleCount INTEGER DEFAULT 0
      )
    `)

    // Create index for efficient date range queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_daily_stats_date 
      ON daily_stats(date DESC)
    `)

    // Initialize summary row if it doesn't exist
    const summary = this.db.prepare('SELECT id FROM summary WHERE id = 1').get()
    if (!summary) {
      this.db.prepare(`
        INSERT INTO summary (id, totalSessions, totalUsageTime, totalNotifications, appStartCount, lastLaunch)
        VALUES (1, 0, 0, 0, 0, ?)
      `).run(new Date().toISOString())
    }
  }

  private migrateFromJSON(dataPath: string): void {
    const jsonPath = path.join(dataPath, 'usage-stats.json')
    
    if (!fs.existsSync(jsonPath)) {
      return
    }

    try {
      console.log('[Stats] Migrating from JSON to SQLite...')
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

      // Migrate summary data
      this.db.prepare(`
        UPDATE summary 
        SET totalSessions = ?, 
            totalUsageTime = ?, 
            totalNotifications = ?, 
            appStartCount = ?,
            lastLaunch = ?
        WHERE id = 1
      `).run(
        data.totalSessions || 0,
        data.totalUsageTime || 0,
        data.totalNotifications || 0,
        data.appStartCount || 0,
        data.lastLaunch || new Date().toISOString()
      )

      // Migrate daily stats
      if (data.dailyStats && Array.isArray(data.dailyStats)) {
        const insert = this.db.prepare(`
          INSERT OR REPLACE INTO daily_stats 
          (date, sessionCount, totalSessionDuration, windowFocusCount, notificationsSent, settingsOpened, dndToggleCount)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)

        for (const daily of data.dailyStats) {
          insert.run(
            daily.date,
            daily.sessionCount || 0,
            daily.totalSessionDuration || 0,
            daily.windowFocusCount || 0,
            daily.notificationsSent || 0,
            daily.settingsOpened || 0,
            daily.dndToggleCount || 0
          )
        }
      }

      // Backup old JSON file and delete
      fs.renameSync(jsonPath, jsonPath + '.backup')
      console.log('[Stats] Migration complete. Old file backed up as usage-stats.json.backup')
    } catch (error) {
      console.error('[Stats] Migration failed:', error)
    }
  }

  private getTodayKey(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }

  private ensureTodayStats(): void {
    const today = this.getTodayKey()
    
    this.db.prepare(`
      INSERT OR IGNORE INTO daily_stats (date) VALUES (?)
    `).run(today)
  }

  // Track app launch
  trackAppLaunch(): void {
    this.db.prepare(`
      UPDATE summary 
      SET appStartCount = appStartCount + 1,
          lastLaunch = ?
      WHERE id = 1
    `).run(new Date().toISOString())
  }

  // Track session start
  startSession(): void {
    this.currentSessionStart = Date.now()
    
    this.db.prepare(`
      UPDATE summary 
      SET totalSessions = totalSessions + 1
      WHERE id = 1
    `).run()

    this.ensureTodayStats()
    const today = this.getTodayKey()
    
    this.db.prepare(`
      UPDATE daily_stats 
      SET sessionCount = sessionCount + 1
      WHERE date = ?
    `).run(today)
  }

  // Track session end
  endSession(): void {
    if (this.currentSessionStart) {
      const duration = Math.floor((Date.now() - this.currentSessionStart) / 1000)
      
      this.db.prepare(`
        UPDATE summary 
        SET totalUsageTime = totalUsageTime + ?
        WHERE id = 1
      `).run(duration)

      const today = this.getTodayKey()
      this.db.prepare(`
        UPDATE daily_stats 
        SET totalSessionDuration = totalSessionDuration + ?
        WHERE date = ?
      `).run(duration, today)
      
      this.currentSessionStart = null
    }
  }

  // Track window focus
  trackWindowFocus(): void {
    this.ensureTodayStats()
    const today = this.getTodayKey()
    
    this.db.prepare(`
      UPDATE daily_stats 
      SET windowFocusCount = windowFocusCount + 1
      WHERE date = ?
    `).run(today)
  }

  // Track notification
  trackNotification(): void {
    this.db.prepare(`
      UPDATE summary 
      SET totalNotifications = totalNotifications + 1
      WHERE id = 1
    `).run()

    this.ensureTodayStats()
    const today = this.getTodayKey()
    
    this.db.prepare(`
      UPDATE daily_stats 
      SET notificationsSent = notificationsSent + 1
      WHERE date = ?
    `).run(today)
  }

  // Track settings opened
  trackSettingsOpened(): void {
    this.ensureTodayStats()
    const today = this.getTodayKey()
    
    this.db.prepare(`
      UPDATE daily_stats 
      SET settingsOpened = settingsOpened + 1
      WHERE date = ?
    `).run(today)
  }

  // Track DND toggle
  trackDndToggle(): void {
    this.ensureTodayStats()
    const today = this.getTodayKey()
    
    this.db.prepare(`
      UPDATE daily_stats 
      SET dndToggleCount = dndToggleCount + 1
      WHERE date = ?
    `).run(today)
  }

  // Get summary stats
  getStats(): UsageStats {
    const summary = this.db.prepare('SELECT * FROM summary WHERE id = 1').get() as any
    
    return {
      totalSessions: summary.totalSessions || 0,
      totalUsageTime: summary.totalUsageTime || 0,
      totalNotifications: summary.totalNotifications || 0,
      appStartCount: summary.appStartCount || 0,
      lastLaunch: summary.lastLaunch || new Date().toISOString()
    }
  }

  // Get stats for last N days (default 30, use 0 for all time)
  getRecentStats(days: number = 30): DailyStats[] {
    let query: string
    
    if (days === 0) {
      // Get all stats
      query = 'SELECT * FROM daily_stats ORDER BY date DESC'
    } else {
      // Get last N days
      query = `SELECT * FROM daily_stats ORDER BY date DESC LIMIT ${days}`
    }
    
    const rows = this.db.prepare(query).all() as any[]
    
    return rows.map(row => ({
      date: row.date,
      sessionCount: row.sessionCount || 0,
      totalSessionDuration: row.totalSessionDuration || 0,
      windowFocusCount: row.windowFocusCount || 0,
      notificationsSent: row.notificationsSent || 0,
      settingsOpened: row.settingsOpened || 0,
      dndToggleCount: row.dndToggleCount || 0
    }))
  }

  // Get stats for a specific date range
  getStatsByDateRange(startDate: string, endDate: string): DailyStats[] {
    const rows = this.db.prepare(`
      SELECT * FROM daily_stats 
      WHERE date BETWEEN ? AND ?
      ORDER BY date DESC
    `).all(startDate, endDate) as any[]
    
    return rows.map(row => ({
      date: row.date,
      sessionCount: row.sessionCount || 0,
      totalSessionDuration: row.totalSessionDuration || 0,
      windowFocusCount: row.windowFocusCount || 0,
      notificationsSent: row.notificationsSent || 0,
      settingsOpened: row.settingsOpened || 0,
      dndToggleCount: row.dndToggleCount || 0
    }))
  }

  // Get total number of tracked days
  getTotalDays(): number {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM daily_stats').get() as any
    return result.count || 0
  }

  // Reset all stats
  resetStats(): void {
    this.db.exec('DELETE FROM daily_stats')
    this.db.prepare(`
      UPDATE summary 
      SET totalSessions = 0,
          totalUsageTime = 0,
          totalNotifications = 0,
          appStartCount = 0,
          lastLaunch = ?
      WHERE id = 1
    `).run(new Date().toISOString())
  }

  // Close database connection
  close(): void {
    this.db.close()
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

// For testing only - reset the singleton
export function __resetStatsManagerForTests(): void {
  if (statsManager) {
    try {
      statsManager.close()
    } catch (e) {
      // Ignore close errors
    }
  }
  statsManager = null
}

