import { Palette } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useSettings } from '@/lib/ipc'

export default function AppearanceTab() {
  const { settings, setSetting } = useSettings()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Appearance
        </CardTitle>
        <CardDescription>Customize the look and feel</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <Label className="text-base">Theme</Label>
          <p className="text-sm text-muted-foreground mb-4">
            Choose your preferred theme for the settings window
          </p>
          <RadioGroup
            value={settings.theme || 'system'}
            onValueChange={val => setSetting('theme', val)}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 space-y-0">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light" className="font-normal cursor-pointer">
                Light
              </Label>
            </div>

            <div className="flex items-center space-x-3 space-y-0">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark" className="font-normal cursor-pointer">
                Dark
              </Label>
            </div>

            <div className="flex items-center space-x-3 space-y-0">
              <RadioGroupItem value="system" id="system" />
              <Label htmlFor="system" className="font-normal cursor-pointer">
                System (follows KDE theme)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="pt-6 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Theme applies to the settings window only. The system tray icon
            automatically adapts to your system theme (light/dark).
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
