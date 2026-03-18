import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import '@testing-library/jest-dom'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.settingsAPI
global.window = Object.create(window)
Object.defineProperty(window, 'settingsAPI', {
  value: {
    getSettings: vi.fn(() => Promise.resolve({
      startMinimized: true,
      closeToTray: true,
      notificationsEnabled: true,
      showPreview: true,
      notificationSound: true,
      dndMode: false,
      theme: 'system',
      firstRun: false,
      failedShortcuts: [],
      sessionType: 'wayland'
    })),
    setSetting: vi.fn(() => Promise.resolve(true)),
    getAutostart: vi.fn(() => Promise.resolve(false)),
    setAutostart: vi.fn(() => Promise.resolve(true)),
    getSystemInfo: vi.fn(() => Promise.resolve({
      platform: 'linux',
      isWayland: true,
      sessionType: 'wayland'
    })),
    getStats: vi.fn(() => Promise.resolve({
      totalSessions: 0,
      totalUsageTime: 0,
      totalNotifications: 0,
      totalWindowFocuses: 0,
      totalSettingsOpens: 0,
      totalDndToggles: 0
    })),
    getRecentStats: vi.fn(() => Promise.resolve([])),
    resetStats: vi.fn(() => Promise.resolve(true)),
    onDndChanged: vi.fn(),
    onNavigateToTab: vi.fn()
  },
  writable: true
})
