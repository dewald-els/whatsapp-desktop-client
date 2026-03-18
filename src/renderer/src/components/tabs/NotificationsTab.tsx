import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useSettings } from '@/lib/ipc'

export default function NotificationsTab() {
  const { settings, setSetting } = useSettings()
  const [showDndNotification, setShowDndNotification] = useState(false)
  
  // Listen for DND changes and show a brief notification
  useEffect(() => {
    window.settingsAPI.onDndChanged((enabled) => {
      setShowDndNotification(true)
      setTimeout(() => setShowDndNotification(false), 3000)
    })
  }, [])
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Manage notification preferences</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notifications-enabled">Enable notifications</Label>
            <p className="text-sm text-muted-foreground">
              Show desktop notifications for new messages
            </p>
          </div>
          <Switch
            id="notifications-enabled"
            checked={settings.notificationsEnabled}
            onCheckedChange={(val) => setSetting('notificationsEnabled', val)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-preview">Show message preview</Label>
            <p className="text-sm text-muted-foreground">
              Display message content in notifications
            </p>
          </div>
          <Switch
            id="show-preview"
            checked={settings.showPreview}
            onCheckedChange={(val) => setSetting('showPreview', val)}
            disabled={!settings.notificationsEnabled}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notification-sound">Play notification sound</Label>
            <p className="text-sm text-muted-foreground">
              Play a sound when you receive notifications
            </p>
          </div>
          <Switch
            id="notification-sound"
            checked={settings.notificationSound}
            onCheckedChange={(val) => setSetting('notificationSound', val)}
            disabled={!settings.notificationsEnabled}
          />
        </div>
        
        <div className="pt-6 border-t">
          <h3 className="text-sm font-medium mb-4">Do Not Disturb</h3>
          
          {showDndNotification && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg animate-in fade-in slide-in-from-top-2">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                DND mode {settings.dndMode ? 'enabled' : 'disabled'} (synced with OS)
              </p>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dnd-mode">Enable Do Not Disturb</Label>
              <p className="text-sm text-muted-foreground">
                Suppress all notifications
              </p>
            </div>
            <Switch
              id="dnd-mode"
              checked={settings.dndMode}
              onCheckedChange={(val) => setSetting('dndMode', val)}
            />
          </div>
          
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> This app automatically syncs with your operating system's Do Not Disturb settings. 
              If your OS is in DND mode, the app will respect that setting.
            </p>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            You can also toggle DND from the tray menu or use <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Ctrl+Shift+D</kbd>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
