import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import GeneralTab from '@/components/tabs/GeneralTab'
import NotificationsTab from '@/components/tabs/NotificationsTab'
import ShortcutsTab from '@/components/tabs/ShortcutsTab'
import AppearanceTab from '@/components/tabs/AppearanceTab'
import StatsTab from '@/components/tabs/StatsTab'
import { useSettings } from '@/lib/ipc'
import '@/styles/globals.css'

function App() {
  const { loading, settings } = useSettings()
  const [activeTab, setActiveTab] = useState('general')
  
  // Apply theme to entire app on load and when it changes
  useEffect(() => {
    const theme = settings.theme || 'system'
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', prefersDark)
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }
  }, [settings.theme])
  
  useEffect(() => {
    // Listen for tab navigation from main process
    window.settingsAPI.onNavigateToTab((tab) => {
      setActiveTab(tab)
    })
  }, [])
  
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
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
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
        
        <TabsContent value="stats" className="mt-0">
          <StatsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default App
