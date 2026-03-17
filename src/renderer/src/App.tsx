import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import GeneralTab from '@/components/tabs/GeneralTab'
import NotificationsTab from '@/components/tabs/NotificationsTab'
import ShortcutsTab from '@/components/tabs/ShortcutsTab'
import AppearanceTab from '@/components/tabs/AppearanceTab'
import { useSettings } from '@/lib/ipc'
import '@/styles/globals.css'

function App() {
  const { loading } = useSettings()
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">WhatsApp Desktop Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your WhatsApp Desktop experience
        </p>
      </div>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="mt-0">
          <GeneralTab />
        </TabsContent>
        
        <TabsContent value="notifications" className="mt-0">
          <NotificationsTab />
        </TabsContent>
        
        <TabsContent value="shortcuts" className="mt-0">
          <ShortcutsTab />
        </TabsContent>
        
        <TabsContent value="appearance" className="mt-0">
          <AppearanceTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default App
