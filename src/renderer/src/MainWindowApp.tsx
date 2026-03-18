import { useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'

declare global {
  interface Window {
    electronAPI: {
      sendNotification: (data: any) => void
    }
  }
}

export default function MainWindowApp() {
  const { toast } = useToast()

  useEffect(() => {
    // Listen for DND changes from main process
    const handleDndChange = (_event: any, enabled: boolean) => {
      const icon = enabled ? BellOff : Bell
      const IconComponent = icon
      
      toast({
        title: enabled ? 'Do Not Disturb enabled' : 'Notifications active',
        description: enabled ? 'Notifications are silenced' : 'You will receive notifications',
        duration: 3000,
        className: enabled 
          ? 'bg-amber-100 text-amber-900 border-2 border-amber-200 [&_button]:bg-amber-400 [&_button_svg]:text-amber-50 [&_button]:hover:bg-amber-500' 
          : 'bg-green-100 text-green-900 border-2 border-green-200 [&_button]:bg-green-400 [&_button_svg]:text-green-50 [&_button]:hover:bg-green-500',
        icon: <IconComponent className="h-4 w-4" />
      })
    }

    // Add event listener via IPC
    ;(window as any).electron?.ipcRenderer?.on('dnd-changed', handleDndChange)

    return () => {
      ;(window as any).electron?.ipcRenderer?.removeListener('dnd-changed', handleDndChange)
    }
  }, [toast])

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* WhatsApp Web WebView */}
      <webview
        id="whatsapp-webview"
        src="https://web.whatsapp.com"
        className="w-full h-full"
        partition="persist:whatsapp"
        useragent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      />
      
      {/* ShadCN Toast Container */}
      <Toaster />
    </div>
  )
}
