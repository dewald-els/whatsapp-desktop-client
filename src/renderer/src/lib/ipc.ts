import { useState, useEffect } from 'react'

declare global {
  interface Window {
    settingsAPI: {
      getSettings: () => Promise<any>
      setSetting: (key: string, value: any) => Promise<boolean>
      getAutostart: () => Promise<boolean>
      setAutostart: (enabled: boolean) => Promise<boolean>
      getSystemInfo: () => Promise<any>
      onDndChanged: (callback: (enabled: boolean) => void) => void
    }
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<any>({})
  const [autoStart, setAutoStartState] = useState(false)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Load initial settings
    Promise.all([
      window.settingsAPI.getSettings(),
      window.settingsAPI.getAutostart()
    ]).then(([settingsData, autoStartData]) => {
      setSettings(settingsData)
      setAutoStartState(autoStartData)
      setLoading(false)
    })
    
    // Listen for DND changes from tray menu
    window.settingsAPI.onDndChanged((enabled) => {
      setSettings((prev: any) => ({ ...prev, dndMode: enabled }))
    })
  }, [])
  
  const setSetting = async (key: string, value: any) => {
    await window.settingsAPI.setSetting(key, value)
    setSettings((prev: any) => ({ ...prev, [key]: value }))
  }
  
  const setAutoStart = async (enabled: boolean) => {
    const success = await window.settingsAPI.setAutostart(enabled)
    if (success) {
      setAutoStartState(enabled)
    }
  }
  
  return {
    settings,
    setSetting,
    autoStart,
    setAutoStart,
    loading
  }
}
