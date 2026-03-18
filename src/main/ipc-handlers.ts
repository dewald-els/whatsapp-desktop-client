import { ipcMain, Notification } from 'electron'
import { getSettingsManager, type Settings } from './settings-manager'
import { getSystemInfo } from './utils/system-info'
import { getMainWindow, showMainWindow } from './windows/main-window'
import { updateTrayMenu } from './tray'
import { getStatsManager } from './stats'
import AutoLaunch from 'auto-launch'
import path from 'path'

const autoLauncher = new AutoLaunch({
  name: 'WhatsApp Desktop',
  path: process.execPath
})

export function registerIpcHandlers() {
  const settingsManager = getSettingsManager()
  
  // Get all settings
  ipcMain.handle('get-settings', () => {
    return settingsManager.getAll()
  })
  
  // Set individual setting
  ipcMain.handle('set-setting', (event, key: keyof Settings, value: any) => {
    // Validate key is a valid settings key
    const validKeys: (keyof Settings)[] = [
      'windowBounds', 'startMinimized', 'closeToTray', 'notificationsEnabled',
      'showPreview', 'notificationSound', 'dndMode', 'theme', 'firstRun', 'failedShortcuts', 'sessionType'
    ]
    
    if (!validKeys.includes(key)) {
      console.error('Invalid settings key:', key)
      return false
    }
    
    // Basic type validation based on key
    const typeValidation: Record<string, string> = {
      startMinimized: 'boolean',
      closeToTray: 'boolean',
      notificationsEnabled: 'boolean',
      showPreview: 'boolean',
      notificationSound: 'boolean',
      dndMode: 'boolean',
      firstRun: 'boolean',
      theme: 'string',
      sessionType: 'string'
    }
    
    const expectedType = typeValidation[key]
    if (expectedType && typeof value !== expectedType) {
      console.error(`Invalid type for ${key}: expected ${expectedType}, got ${typeof value}`)
      return false
    }
    
    settingsManager.set(key, value as any)
    
    // Handle side effects
    if (key === 'dndMode') {
      updateTrayMenu()
      // Track DND toggle
      try {
        const statsManager = getStatsManager()
        statsManager.trackDndToggle()
      } catch (error) {
        console.error('Failed to track DND toggle:', error)
      }
    }
    
    return true
  })
  
  // Auto-start management
  ipcMain.handle('get-autostart', async () => {
    try {
      return await autoLauncher.isEnabled()
    } catch (err) {
      console.error('Failed to check autostart status:', err)
      return false
    }
  })
  
  ipcMain.handle('set-autostart', async (event, enabled: boolean) => {
    try {
      if (enabled) {
        const startMinimized = settingsManager.get('startMinimized')
        if (startMinimized) {
          autoLauncher.opts.isHidden = ['--hidden']
        }
        await autoLauncher.enable()
        return true
      } else {
        await autoLauncher.disable()
        return true
      }
    } catch (err) {
      console.error('Failed to set autostart:', err)
      return false
    }
  })
  
  // Get system info
  ipcMain.handle('get-system-info', () => {
    return getSystemInfo()
  })
  
  // WhatsApp notification handler
  ipcMain.on('whatsapp-notification', (event, data) => {
    handleWhatsAppNotification(data)
  })
  
  // Statistics handlers
  ipcMain.handle('get-stats', () => {
    try {
      const statsManager = getStatsManager()
      return statsManager.getStats()
    } catch (error) {
      console.error('Failed to get stats:', error)
      return null
    }
  })
  
  ipcMain.handle('get-recent-stats', (event, days: number = 30) => {
    try {
      const statsManager = getStatsManager()
      return statsManager.getRecentStats(days)
    } catch (error) {
      console.error('Failed to get recent stats:', error)
      return []
    }
  })
  
  ipcMain.handle('reset-stats', () => {
    try {
      const statsManager = getStatsManager()
      statsManager.resetStats()
      return true
    } catch (error) {
      console.error('Failed to reset stats:', error)
      return false
    }
  })
}

function handleWhatsAppNotification(data: any) {
  // Validate input data
  if (!data || typeof data !== 'object') {
    console.error('Invalid notification data')
    return
  }
  
  const { title, body, icon, tag } = data
  
  // Validate required fields are strings
  if (typeof title !== 'string' || typeof body !== 'string') {
    console.error('Invalid notification data types')
    return
  }
  
  const settingsManager = getSettingsManager()
  
  // Check DND mode
  if (settingsManager.get('dndMode')) {
    console.log('DND mode active, suppressing notification')
    return
  }
  
  // Check if notifications enabled
  if (!settingsManager.get('notificationsEnabled')) {
    return
  }
  
  // Check message preview setting
  const showPreview = settingsManager.get('showPreview')
  const notificationBody = showPreview ? body : 'New message'
  
  const notification = new Notification({
    title,
    body: notificationBody,
    icon: icon || path.join(__dirname, '../../assets/whatsapp.png'),
    urgency: 'normal',
    timeoutType: 'default',
    silent: !settingsManager.get('notificationSound')
  })
  
  // Click handler - show window and attempt to focus chat
  notification.on('click', () => {
    showMainWindow()
    
    // Try to focus the specific chat
    const mainWindow = getMainWindow()
    if (mainWindow) {
      focusChat(mainWindow, String(title || ''), String(tag || ''))
    }
  })
  
  notification.show()
  
  // Track notification
  try {
    const statsManager = getStatsManager()
    statsManager.trackNotification()
  } catch (error) {
    console.error('Failed to track notification:', error)
  }
}

function focusChat(mainWindow: any, chatName: string, tag: string) {
  // Sanitize inputs to prevent XSS - escape special characters
  const sanitize = (str: string): string => {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/</g, '\\x3C')
      .replace(/>/g, '\\x3E')
  }
  
  const safeChatName = sanitize(chatName)
  const safeTag = sanitize(tag)
  
  mainWindow.webContents.executeJavaScript(`
    (function() {
      // Extract chat ID from tag if available
      let chatId = "${safeTag}";
      if (chatId.includes('message:')) {
        chatId = chatId.split('message:')[1];
      } else {
        chatId = "${safeChatName}";
      }
      
      // Try to find and click the chat element
      const chatElement = document.querySelector(\`[data-id="\${chatId}"]\`) ||
                          document.querySelector(\`[title*="\${chatId}"]\`);
      
      if (chatElement) {
        chatElement.click();
        return true;
      }
      
      // Fallback: focus search for manual navigation
      const searchBox = document.querySelector('[data-testid="chat-list-search"]');
      if (searchBox) {
        searchBox.focus();
      }
      
      return false;
    })();
  `).catch(err => {
    console.error('Failed to focus chat:', err)
  })
}
