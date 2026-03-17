import { ipcMain, Notification } from 'electron'
import store, { StoreSchema } from './store'
import { getSystemInfo } from './utils/system-info'
import { getMainWindow, showMainWindow } from './windows/main-window'
import { updateTrayMenu } from './tray'
import AutoLaunch from 'auto-launch'
import path from 'path'

const autoLauncher = new AutoLaunch({
  name: 'WhatsApp Desktop',
  path: process.execPath
})

export function registerIpcHandlers() {
  // Get all settings
  ipcMain.handle('get-settings', () => {
    return store.store
  })
  
  // Set individual setting
  ipcMain.handle('set-setting', (event, key: keyof StoreSchema, value: any) => {
    // Validate key is a valid store key
    const validKeys: (keyof StoreSchema)[] = [
      'windowBounds', 'startMinimized', 'closeToTray', 'notificationsEnabled',
      'showPreview', 'notificationSound', 'dndMode', 'theme', 'firstRun', 'failedShortcuts', 'sessionType'
    ]
    
    if (!validKeys.includes(key)) {
      console.error('Invalid store key:', key)
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
    
    store.set(key, value)
    
    // Handle side effects
    if (key === 'dndMode') {
      updateTrayMenu()
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
        const startMinimized = store.get('startMinimized', false)
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
  
  // Check DND mode
  if (store.get('dndMode', false)) {
    console.log('DND mode active, suppressing notification')
    return
  }
  
  // Check if notifications enabled
  if (!store.get('notificationsEnabled', true)) {
    return
  }
  
  // Check message preview setting
  const showPreview = store.get('showPreview', true)
  const notificationBody = showPreview ? body : 'New message'
  
  const notification = new Notification({
    title,
    body: notificationBody,
    icon: icon || path.join(__dirname, '../../assets/whatsapp.png'),
    urgency: 'normal',
    timeoutType: 'default',
    silent: !store.get('notificationSound', true)
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
