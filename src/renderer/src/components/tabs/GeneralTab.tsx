import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useSettings } from '@/lib/ipc'

export default function GeneralTab() {
  const { settings, setSetting, autoStart, setAutoStart } = useSettings()
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>Configure startup and window behavior</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-start">Auto-start on boot</Label>
            <p className="text-sm text-muted-foreground">
              Launch WhatsApp Desktop when you log in
            </p>
          </div>
          <Switch
            id="auto-start"
            checked={autoStart}
            onCheckedChange={setAutoStart}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="start-minimized">Start minimized to tray</Label>
            <p className="text-sm text-muted-foreground">
              Start hidden in system tray
            </p>
          </div>
          <Switch
            id="start-minimized"
            checked={settings.startMinimized}
            onCheckedChange={(val) => setSetting('startMinimized', val)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="close-to-tray">Close to tray</Label>
            <p className="text-sm text-muted-foreground">
              Minimize to tray instead of quitting
            </p>
          </div>
          <Switch
            id="close-to-tray"
            checked={settings.closeToTray}
            onCheckedChange={(val) => setSetting('closeToTray', val)}
          />
        </div>
        
        <div className="pt-6 border-t">
          <h3 className="text-sm font-medium mb-2">About</h3>
          <p className="text-sm text-muted-foreground">
            WhatsApp Desktop v1.0.0
          </p>
          <p className="text-sm text-muted-foreground">
            Electron {settings.electronVersion || 'Unknown'}
          </p>
          <p className="text-sm text-muted-foreground">
            Session: {settings.sessionType || 'Unknown'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
