import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSettings } from '@/lib/ipc'
import { Keyboard } from 'lucide-react'

export default function ShortcutsTab() {
  const { settings } = useSettings()
  
  const shortcuts = [
    { key: 'Alt+K', description: 'Focus WhatsApp search', note: 'Native WhatsApp Web shortcut' },
    { key: 'Ctrl+Shift+W', description: 'Show/hide main window', note: 'Global shortcut' },
    { key: 'Ctrl+,', description: 'Open settings', note: 'Global shortcut' },
    { key: 'Ctrl+Shift+D', description: 'Toggle Do Not Disturb', note: 'Global shortcut' }
  ]
  
  const failedShortcuts = settings.failedShortcuts || []
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          Keyboard Shortcuts
        </CardTitle>
        <CardDescription>Global shortcuts for quick access</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {shortcuts.map((shortcut) => {
            const failed = failedShortcuts.includes(shortcut.key.replace('Ctrl', 'CommandOrControl'))
            
            return (
              <div key={shortcut.key} className="flex items-start justify-between pb-4 border-b last:border-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{shortcut.description}</p>
                    <Badge variant={failed ? 'destructive' : 'default'}>
                      {failed ? 'Failed' : 'Active'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{shortcut.note}</p>
                </div>
                
                <kbd className="px-2 py-1 text-sm font-mono bg-muted rounded">
                  {shortcut.key}
                </kbd>
              </div>
            )
          })}
        </div>
        
        {settings.sessionType === 'wayland' && (
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-900">
            <p className="text-sm">
              <strong>Wayland detected:</strong> Global shortcuts may require permission
              dialogs or may not work on all compositors.
            </p>
          </div>
        )}
        
        {failedShortcuts.length > 0 && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-900">
            <p className="text-sm">
              <strong>Some shortcuts failed to register.</strong> This may be due to conflicts
              with existing shortcuts or system restrictions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
