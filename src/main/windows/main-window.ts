import path from 'node:path'
import { app, BrowserWindow } from 'electron'
import { getSettingsManager } from '../settings-manager'
import { logSecurityEvent } from '../utils/security-logger'
import { getAppIcon } from '../utils/theme-detector'

let mainWindow: BrowserWindow | null = null
let isQuitting = false

export function createMainWindow(): BrowserWindow {
  const settingsManager = getSettingsManager()
  const bounds = settingsManager.get('windowBounds') || { width: 1024, height: 768 }

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x || undefined,
    y: bounds.y || undefined,
    icon: getAppIcon(),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      partition: 'persist:whatsapp',
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Need to disable sandbox for webview tag
      webviewTag: true, // Enable webview tag
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      enableBlinkFeatures: '',
      disableBlinkFeatures: 'Auxclick', // Prevent middle-click attacks
      preload: path.join(__dirname, '../../preload/main-preload.js'),
    },
  })

  // Remove menu completely
  mainWindow.removeMenu()

  // Security: Restrict permissions
  mainWindow.webContents.session.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      const allowedPermissions = [
        'media', // Required for voice messages/calls
        'notifications', // Required for notifications
        'clipboard-read', // Required for paste
        'clipboard-sanitized-write', // Required for copy
      ]

      if (allowedPermissions.includes(permission)) {
        console.log('Permission granted:', permission)
        callback(true)
      } else {
        logSecurityEvent({
          timestamp: new Date().toISOString(),
          type: 'permission_denied',
          details: `Denied permission: ${permission}`,
          severity: 'medium',
        })
        callback(false)
      }
    }
  )

  // Security: Prevent navigation away from WhatsApp Web
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const allowedDomains = ['web.whatsapp.com', 'www.whatsapp.com']
    const parsedUrl = new URL(navigationUrl)

    if (!allowedDomains.includes(parsedUrl.hostname)) {
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        type: 'navigation_blocked',
        details: `Blocked navigation to: ${navigationUrl}`,
        severity: 'high',
      })
      event.preventDefault()
    }
  })

  // Security: Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' https://web.whatsapp.com https://*.whatsapp.com https://*.whatsapp.net; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' data: https://web.whatsapp.com https://*.whatsapp.com https://*.whatsapp.net; " +
            "style-src 'self' 'unsafe-inline' https://web.whatsapp.com https://*.whatsapp.com https://*.whatsapp.net; " +
            "img-src 'self' data: blob: https: http:; " +
            "media-src 'self' data: blob: https: http: mediastream:; " +
            "connect-src 'self' https: wss: blob:; " +
            "font-src 'self' data: https://web.whatsapp.com https://*.whatsapp.com https://*.whatsapp.net; " +
            "worker-src 'self' blob:; " +
            'frame-src https://*.whatsapp.net https://*.whatsapp.com; ' +
            "object-src 'none'; " +
            "base-uri 'self';",
        ],
      },
    })
  })

  // Security: Prevent opening new windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const allowedDomains = ['web.whatsapp.com', 'www.whatsapp.com']

    try {
      const parsedUrl = new URL(url)
      if (!allowedDomains.includes(parsedUrl.hostname)) {
        logSecurityEvent({
          timestamp: new Date().toISOString(),
          type: 'window_blocked',
          details: `Blocked new window for: ${url}`,
          severity: 'high',
        })
        return { action: 'deny' }
      }
    } catch {
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        type: 'window_blocked',
        details: `Blocked invalid URL: ${url}`,
        severity: 'high',
      })
      return { action: 'deny' }
    }

    return { action: 'allow' }
  })

  app.on('certificate-error', (_event, _webContents, url, error, certificate, callback) => {
    const parsedUrl = new URL(url)

    // Only apply pinning to WhatsApp domains
    if (
      parsedUrl.hostname.endsWith('.whatsapp.com') ||
      parsedUrl.hostname.endsWith('.whatsapp.net')
    ) {
      // For now, just log the certificate fingerprint for monitoring
      const fingerprint = certificate.fingerprint.replace(/:/g, '').toLowerCase()
      console.log('WhatsApp certificate fingerprint:', `sha256/${fingerprint}`)

      logSecurityEvent({
        timestamp: new Date().toISOString(),
        type: 'cert_error',
        details: `Certificate for ${url}: ${error}. Fingerprint: sha256/${fingerprint}`,
        severity: 'critical',
      })
    }

    // Default behavior: trust system certificates
    callback(true)
  })

  // Security: Block suspicious remote content
  mainWindow.webContents.session.webRequest.onBeforeRequest((details, callback) => {
    const url = new URL(details.url)

    // Block known tracking/analytics domains
    const blockedDomains = [
      'connect.facebook.net',
      'www.facebook.com/tr',
      'analytics.google.com',
      'googletagmanager.com',
    ]

    const isBlocked = blockedDomains.some(domain => url.hostname.includes(domain))

    if (isBlocked) {
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        type: 'suspicious_activity',
        details: `Blocked tracking request to: ${details.url}`,
        severity: 'low',
      })
      callback({ cancel: true })
    } else {
      callback({ cancel: false })
    }
  })

  // Load React wrapper (which contains the WhatsApp webview)
  const isDev = process.argv.includes('--dev')
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173/main-window.html')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/main-window.html'))
  }

  // Show window when ready to avoid blank screen
  mainWindow.webContents.on('did-finish-load', () => {
    const settingsManager = getSettingsManager()
    // Only auto-show if not starting minimized
    const startMinimized = settingsManager.get('startMinimized')
    const args = process.argv.slice(1)
    const startHidden = args.includes('--hidden')

    if (!startMinimized && !startHidden && mainWindow) {
      mainWindow.show()
    }
  })

  // Save window bounds on move/resize
  mainWindow.on('resize', saveWindowBounds)
  mainWindow.on('move', saveWindowBounds)

  // Handle close button - minimize to tray instead of quit
  mainWindow.on('close', event => {
    const settingsManager = getSettingsManager()
    if (!isQuitting && settingsManager.get('closeToTray')) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  return mainWindow
}

function saveWindowBounds() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const settingsManager = getSettingsManager()
    const bounds = mainWindow.getBounds()
    settingsManager.set('windowBounds', bounds)
  }
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function setQuitting(value: boolean) {
  isQuitting = value
}

export function toggleMainWindow() {
  if (mainWindow) {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  }
}

export function showMainWindow() {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  }
}

// Handle app quit
app.on('before-quit', () => {
  setQuitting(true)
})
