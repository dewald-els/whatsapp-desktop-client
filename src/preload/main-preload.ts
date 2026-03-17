import { contextBridge, ipcRenderer } from 'electron'

// Expose minimal API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  sendNotification: (data: any) => {
    ipcRenderer.send('whatsapp-notification', data)
  }
})

// Override Notification API to intercept WhatsApp's notifications
window.addEventListener('DOMContentLoaded', () => {
  // Store original Notification constructor
  const OriginalNotification = window.Notification as any
  
  // Create custom Notification class
  class ElectronNotification extends EventTarget implements Notification {
    public title: string
    public body: string
    public tag: string
    public icon: string
    public data: any
    
    // Notification API properties
    public badge: string = ''
    public dir: NotificationDirection = 'auto'
    public lang: string = ''
    public vibrate: readonly number[] = []
    public renotify: boolean = false
    public requireInteraction: boolean = false
    public silent: boolean | null = null
    public timestamp: number = Date.now()
    public onclick: ((this: Notification, ev: Event) => any) | null = null
    public onclose: ((this: Notification, ev: Event) => any) | null = null
    public onerror: ((this: Notification, ev: Event) => any) | null = null
    public onshow: ((this: Notification, ev: Event) => any) | null = null
    public actions: readonly any[] = []
    public image: string = ''
    
    private originalNotification: Notification
    
    constructor(title: string, options?: NotificationOptions) {
      super()
      
      this.title = title
      this.body = options?.body || ''
      this.tag = options?.tag || ''
      this.icon = options?.icon || ''
      this.data = options?.data || {}
      
      // Send to main process for native notification
      ipcRenderer.send('whatsapp-notification', {
        title,
        body: this.body,
        icon: this.icon,
        tag: this.tag,
        data: this.data
      })
      
      // Also create original notification (WhatsApp Web expects it)
      this.originalNotification = new OriginalNotification(title, options)
      
      // Forward events from original notification
      this.originalNotification.onclick = (e) => {
        if (this.onclick) this.onclick.call(this, e)
        this.dispatchEvent(new Event('click'))
      }
      this.originalNotification.onclose = (e) => {
        if (this.onclose) this.onclose.call(this, e)
        this.dispatchEvent(new Event('close'))
      }
      this.originalNotification.onerror = (e) => {
        if (this.onerror) this.onerror.call(this, e)
        this.dispatchEvent(new Event('error'))
      }
      this.originalNotification.onshow = (e) => {
        if (this.onshow) this.onshow.call(this, e)
        this.dispatchEvent(new Event('show'))
      }
    }
    
    close() {
      this.originalNotification?.close()
    }
    
    static permission: NotificationPermission = 'granted'
    
    static requestPermission(): Promise<NotificationPermission> {
      return Promise.resolve('granted')
    }
    
    static get maxActions(): number {
      return 0
    }
  }
  
  // Replace global Notification
  Object.defineProperty(window, 'Notification', {
    value: ElectronNotification,
    writable: false,
    configurable: false
  })
})
