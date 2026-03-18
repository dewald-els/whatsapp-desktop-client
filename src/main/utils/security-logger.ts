import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

const LOG_DIR = path.join(app.getPath('userData'), 'logs')
const LOG_FILE = path.join(LOG_DIR, 'security.log')
const MAX_LOG_SIZE = 5 * 1024 * 1024 // 5MB

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

interface SecurityEvent {
  timestamp: string
  type:
    | 'navigation_blocked'
    | 'permission_denied'
    | 'window_blocked'
    | 'cert_error'
    | 'csp_violation'
    | 'suspicious_activity'
  details: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export function logSecurityEvent(event: SecurityEvent) {
  const logEntry = `[${event.timestamp}] [${event.severity.toUpperCase()}] [${event.type}] ${event.details}\n`

  // Console output
  if (event.severity === 'high' || event.severity === 'critical') {
    console.error('SECURITY:', logEntry.trim())
  } else {
    console.log('SECURITY:', logEntry.trim())
  }

  // File logging
  try {
    // Rotate log if too large
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE)
      if (stats.size > MAX_LOG_SIZE) {
        fs.renameSync(LOG_FILE, `${LOG_FILE}.old`)
      }
    }

    fs.appendFileSync(LOG_FILE, logEntry)
  } catch (err) {
    console.error('Failed to write security log:', err)
  }
}

export function getSecurityLogs(): string {
  try {
    if (fs.existsSync(LOG_FILE)) {
      return fs.readFileSync(LOG_FILE, 'utf-8')
    }
  } catch (err) {
    console.error('Failed to read security logs:', err)
  }
  return ''
}

export function clearSecurityLogs() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      fs.unlinkSync(LOG_FILE)
    }
    if (fs.existsSync(`${LOG_FILE}.old`)) {
      fs.unlinkSync(`${LOG_FILE}.old`)
    }
  } catch (err) {
    console.error('Failed to clear security logs:', err)
  }
}
