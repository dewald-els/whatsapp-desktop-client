import * as dbus from 'dbus-next'
import { BrowserWindow } from 'electron'
import { getSettingsManager } from '../settings-manager'
import { updateTrayMenu } from '../tray'

const { systemBus, sessionBus } = dbus

let dbusConnection: dbus.MessageBus | null = null
let cleanupFunctions: (() => void)[] = []

/**
 * Detects if the operating system is in Do Not Disturb mode
 * Uses D-Bus to check notification inhibit status
 */
async function detectOSDndStatus(): Promise<boolean> {
  try {
    if (!dbusConnection) {
      dbusConnection = sessionBus()
    }

    // Check FreeDesktop Notifications interface for inhibit status
    const obj = await dbusConnection.getProxyObject(
      'org.freedesktop.Notifications',
      '/org/freedesktop/Notifications'
    )
    
    const notificationsInterface = obj.getInterface('org.freedesktop.Notifications')
    
    // Try to get the Inhibited property
    try {
      const inhibited = await notificationsInterface.Inhibited()
      return inhibited === true
    } catch (error) {
      // Property might not exist, try method call
      try {
        const result = await notificationsInterface.GetInhibited()
        return result === true
      } catch (error2) {
        // If both fail, assume not inhibited
        return false
      }
    }
  } catch (error) {
    console.error('Error detecting OS DND status via D-Bus:', error)
    return false
  }
}

/**
 * Syncs the app's DND mode with the OS DND status
 */
async function syncWithOSDnd(): Promise<void> {
  try {
    const settingsManager = getSettingsManager()
    const osDndEnabled = await detectOSDndStatus()
    const appDndEnabled = settingsManager.get('dndMode')
    
    // Only update if there's a difference
    if (osDndEnabled !== appDndEnabled) {
      console.log(`[DND Sync] OS=${osDndEnabled}, App=${appDndEnabled} -> Updating app to ${osDndEnabled}`)
      settingsManager.set('dndMode', osDndEnabled)
      updateTrayMenu()
      
      // Notify all renderer windows about the DND change
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('dnd-changed', osDndEnabled)
      })
    }
  } catch (error) {
    console.error('Error syncing with OS DND:', error)
  }
}

/**
 * Subscribes to D-Bus signals for real-time DND status changes
 */
async function subscribeToDBusSignals(): Promise<void> {
  try {
    if (!dbusConnection) {
      dbusConnection = sessionBus()
    }

    console.log('[DND Monitor] Setting up D-Bus signal subscriptions...')

    // Subscribe to FreeDesktop Notifications property changes
    try {
      const obj = await dbusConnection.getProxyObject(
        'org.freedesktop.Notifications',
        '/org/freedesktop/Notifications'
      )
      
      const propertiesInterface = obj.getInterface('org.freedesktop.DBus.Properties')
      
      // Listen for PropertiesChanged signal
      propertiesInterface.on('PropertiesChanged', (iface: string, changedProps: any, invalidatedProps: string[]) => {
        if (iface === 'org.freedesktop.Notifications') {
          console.log('[DND Monitor] Notifications properties changed:', changedProps)
          
          if ('Inhibited' in changedProps || invalidatedProps.includes('Inhibited')) {
            console.log('[DND Monitor] Inhibited property changed, syncing...')
            syncWithOSDnd()
          }
        }
      })
      
      console.log('[DND Monitor] ✓ Subscribed to FreeDesktop Notifications PropertiesChanged')
    } catch (error) {
      console.warn('[DND Monitor] Could not subscribe to FreeDesktop Notifications signals:', error)
    }

    // For KDE Plasma: Monitor KWin/Plasma D-Bus signals
    try {
      // KDE uses different signals - let's try to catch config changes
      dbusConnection.on('message', (msg: any) => {
        // Monitor any notification-related signals
        if (msg.interface && msg.interface.includes('Notification')) {
          console.log('[DND Monitor] KDE notification signal received, syncing...')
          syncWithOSDnd()
        }
      })
      
      console.log('[DND Monitor] ✓ Monitoring KDE notification signals')
    } catch (error) {
      console.warn('[DND Monitor] Could not set up KDE signal monitoring:', error)
    }

    // For GNOME: Monitor GSettings changes
    try {
      // GNOME uses GSettings which can be monitored via D-Bus
      const gsettingsObj = await dbusConnection.getProxyObject(
        'ca.desrt.dconf',
        '/ca/desrt/dconf/Writer/user'
      )
      
      const dconfInterface = gsettingsObj.getInterface('ca.desrt.dconf.Writer')
      
      dconfInterface.on('Notify', (path: string, keys: string[], tag: string) => {
        if (path.includes('notifications') || keys.some(k => k.includes('banner'))) {
          console.log('[DND Monitor] GNOME notifications settings changed, syncing...')
          syncWithOSDnd()
        }
      })
      
      console.log('[DND Monitor] ✓ Subscribed to GNOME GSettings notifications')
    } catch (error) {
      console.warn('[DND Monitor] Could not subscribe to GNOME GSettings signals:', error)
    }

  } catch (error) {
    console.error('[DND Monitor] Error setting up D-Bus subscriptions:', error)
  }
}

/**
 * Starts monitoring OS DND status using D-Bus signals (pub-sub pattern)
 * This provides real-time updates instead of polling
 */
export async function startOSDndMonitoring(): Promise<void> {
  try {
    if (process.platform !== 'linux') {
      console.log('[DND Monitor] Not on Linux, skipping D-Bus monitoring')
      return
    }

    console.log('[DND Monitor] Initializing real-time DND monitoring via D-Bus...')

    // Initial sync
    await syncWithOSDnd()
    
    // Subscribe to D-Bus signals for real-time updates
    await subscribeToDBusSignals()
    
    // Fallback: Still do periodic checks every 60 seconds in case signals are missed
    const fallbackIntervalId = setInterval(() => {
      console.log('[DND Monitor] Running periodic fallback check...')
      syncWithOSDnd()
    }, 60000)
    
    cleanupFunctions.push(() => clearInterval(fallbackIntervalId))
    
    console.log('[DND Monitor] ✓ Real-time DND monitoring active')
    
  } catch (error) {
    console.error('[DND Monitor] Failed to start DND monitoring:', error)
    
    // Ultimate fallback: poll every 30 seconds if D-Bus fails completely
    console.log('[DND Monitor] Falling back to polling mode (30s interval)')
    const intervalId = setInterval(() => {
      syncWithOSDnd()
    }, 30000)
    
    cleanupFunctions.push(() => clearInterval(intervalId))
  }
}

/**
 * Stops monitoring OS DND status and cleans up D-Bus connections
 */
export function stopOSDndMonitoring(): void {
  console.log('[DND Monitor] Cleaning up DND monitoring...')
  
  // Run all cleanup functions
  cleanupFunctions.forEach(cleanup => cleanup())
  cleanupFunctions = []
  
  // Close D-Bus connection
  if (dbusConnection) {
    try {
      dbusConnection.disconnect()
    } catch (error) {
      console.error('[DND Monitor] Error disconnecting D-Bus:', error)
    }
    dbusConnection = null
  }
  
  console.log('[DND Monitor] ✓ Cleanup complete')
}
