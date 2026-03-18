import { vi, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Mock Electron modules with callable mocks
const appGetPathMock = vi.fn((name: string) => {
  if (name === 'home') return os.tmpdir()
  if (name === 'userData') return path.join(os.tmpdir(), 'test-app-data')
  return os.tmpdir()
})

vi.mock('electron', () => ({
  app: {
    getPath: appGetPathMock,
    on: vi.fn(),
    quit: vi.fn(),
    whenReady: vi.fn(() => Promise.resolve()),
    commandLine: {
      appendSwitch: vi.fn()
    },
    requestSingleInstanceLock: vi.fn(() => true)
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn()
  },
  BrowserWindow: vi.fn(() => ({
    loadURL: vi.fn(),
    webContents: {
      send: vi.fn(),
      on: vi.fn(),
      session: {
        setPermissionRequestHandler: vi.fn(),
        webRequest: {
          onHeadersReceived: vi.fn(),
          onBeforeRequest: vi.fn()
        }
      },
      executeJavaScript: vi.fn()
    },
    on: vi.fn(),
    removeMenu: vi.fn(),
    getBounds: vi.fn(() => ({ x: 0, y: 0, width: 1024, height: 768 })),
    show: vi.fn(),
    hide: vi.fn(),
    focus: vi.fn(),
    isVisible: vi.fn(() => true),
    isMinimized: vi.fn(() => false),
    restore: vi.fn(),
    isDestroyed: vi.fn(() => false)
  })),
  Tray: vi.fn(() => ({
    setToolTip: vi.fn(),
    setImage: vi.fn(),
    setContextMenu: vi.fn(),
    on: vi.fn(),
    isDestroyed: vi.fn(() => false)
  })),
  Menu: {
    buildFromTemplate: vi.fn((template) => template)
  },
  nativeTheme: {
    on: vi.fn(),
    shouldUseDarkColors: false
  },
  Notification: vi.fn(() => ({
    show: vi.fn(),
    on: vi.fn()
  })),
  globalShortcut: {
    register: vi.fn(() => true),
    unregisterAll: vi.fn()
  }
}))

// Mock dbus-next
vi.mock('dbus-next', () => ({
  systemBus: vi.fn(() => ({
    getProxyObject: vi.fn(),
    on: vi.fn(),
    disconnect: vi.fn()
  })),
  sessionBus: vi.fn(() => ({
    getProxyObject: vi.fn(),
    on: vi.fn(),
    disconnect: vi.fn()
  }))
}))

// Mock auto-launch
vi.mock('auto-launch', () => ({
  default: vi.fn(() => ({
    isEnabled: vi.fn(() => Promise.resolve(false)),
    enable: vi.fn(() => Promise.resolve()),
    disable: vi.fn(() => Promise.resolve()),
    opts: {}
  }))
}))

// Cleanup test files after each test
afterEach(() => {
  const testDataPath = path.join(os.tmpdir(), 'test-app-data')
  if (fs.existsSync(testDataPath)) {
    fs.rmSync(testDataPath, { recursive: true, force: true })
  }
})
