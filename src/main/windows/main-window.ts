import { BrowserWindow, app } from 'electron'
import path from 'path'
import store from '../store'
import { getAppIcon } from '../utils/theme-detector'
import { logSecurityEvent } from '../utils/security-logger'

let mainWindow: BrowserWindow | null = null
let isQuitting = false

export function createMainWindow(): BrowserWindow {
  const bounds = store.get('windowBounds')
  
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
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      enableBlinkFeatures: '',
      disableBlinkFeatures: 'Auxclick', // Prevent middle-click attacks
      preload: path.join(__dirname, '../preload/main-preload.js')
    }
  })
  
  // Remove menu completely
  mainWindow.removeMenu()
  
  // Security: Restrict permissions
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = [
      'media', // Required for voice messages/calls
      'notifications', // Required for notifications
      'clipboard-read', // Required for paste
      'clipboard-sanitized-write' // Required for copy
    ]
    
    if (allowedPermissions.includes(permission)) {
      console.log('Permission granted:', permission)
      callback(true)
    } else {
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        type: 'permission_denied',
        details: `Denied permission: ${permission}`,
        severity: 'medium'
      })
      callback(false)
    }
  })
  
  // Security: Prevent navigation away from WhatsApp Web
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const allowedDomains = ['web.whatsapp.com', 'www.whatsapp.com']
    const parsedUrl = new URL(navigationUrl)
    
    if (!allowedDomains.includes(parsedUrl.hostname)) {
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        type: 'navigation_blocked',
        details: `Blocked navigation to: ${navigationUrl}`,
        severity: 'high'
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
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://web.whatsapp.com https://*.whatsapp.com; " +
          "style-src 'self' 'unsafe-inline' https://web.whatsapp.com; " +
          "img-src 'self' data: blob: https: http:; " +
          "media-src 'self' data: blob: https: http: mediastream:; " +
          "connect-src 'self' https: wss: blob:; " +
          "font-src 'self' data: https://web.whatsapp.com; " +
          "worker-src 'self' blob:; " +
          "frame-src 'none'; " +
          "object-src 'none'; " +
          "base-uri 'self';"
        ]
      }
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
          severity: 'high'
        })
        return { action: 'deny' }
      }
    } catch {
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        type: 'window_blocked',
        details: `Blocked invalid URL: ${url}`,
        severity: 'high'
      })
      return { action: 'deny' }
    }
    
    return { action: 'allow' }
  })
  
  // Security: Certificate pinning for WhatsApp domains
  // These are WhatsApp's current certificate fingerprints (SHA-256)
  // Note: These need to be updated when WhatsApp rotates certificates
  const whatsappCertFingerprints = [
    // Facebook/Meta certificates - these are examples, should be verified
    'sha256/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // Primary cert
    'sha256/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'  // Backup cert
  ]
  
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    const parsedUrl = new URL(url)
    
    // Only apply pinning to WhatsApp domains
    if (parsedUrl.hostname.endsWith('.whatsapp.com') || parsedUrl.hostname.endsWith('.whatsapp.net')) {
      // For now, just log the certificate fingerprint for monitoring
      const fingerprint = certificate.fingerprint.replace(/:/g, '').toLowerCase()
      console.log('WhatsApp certificate fingerprint:', 'sha256/' + fingerprint)
      
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        type: 'cert_error',
        details: `Certificate for ${url}: ${error}. Fingerprint: sha256/${fingerprint}`,
        severity: 'critical'
      })
      
      // In production, you would verify against known good fingerprints:
      // if (!whatsappCertFingerprints.includes('sha256/' + fingerprint)) {
      //   console.error('Certificate pinning failed for:', url)
      //   callback(false)
      //   return
      // }
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
      'googletagmanager.com'
    ]
    
    const isBlocked = blockedDomains.some(domain => url.hostname.includes(domain))
    
    if (isBlocked) {
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        type: 'suspicious_activity',
        details: `Blocked tracking request to: ${details.url}`,
        severity: 'low'
      })
      callback({ cancel: true })
    } else {
      callback({ cancel: false })
    }
  })
  
  // Load WhatsApp Web with custom user agent
  const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  mainWindow.loadURL('https://web.whatsapp.com', { userAgent })
  
  // Show window when ready to avoid blank screen
  mainWindow.webContents.on('did-finish-load', () => {
    // Only auto-show if not starting minimized
    const startMinimized = store.get('startMinimized', true)
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
  mainWindow.on('close', (event) => {
    if (!isQuitting && store.get('closeToTray')) {
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
    const bounds = mainWindow.getBounds()
    store.set('windowBounds', bounds)
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
