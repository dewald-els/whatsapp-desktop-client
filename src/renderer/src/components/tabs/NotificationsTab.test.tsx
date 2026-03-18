import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotificationsTab from './NotificationsTab'

describe('NotificationsTab', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
  })

  it('should render notifications tab with all settings', () => {
    render(<NotificationsTab />)
    
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('Enable notifications')).toBeInTheDocument()
    expect(screen.getByText('Show message preview')).toBeInTheDocument()
    expect(screen.getByText('Play notification sound')).toBeInTheDocument()
    expect(screen.getByText('Do Not Disturb')).toBeInTheDocument()
  })

  it('should display correct initial state for notifications enabled', () => {
    render(<NotificationsTab />)
    
    const notificationsSwitch = screen.getByRole('switch', { name: /enable notifications/i })
    expect(notificationsSwitch).toBeChecked()
  })

  it('should toggle notifications enabled when clicked', async () => {
    const user = userEvent.setup()
    render(<NotificationsTab />)
    
    const notificationsSwitch = screen.getByRole('switch', { name: /enable notifications/i })
    
    await user.click(notificationsSwitch)
    
    expect(window.settingsAPI.setSetting).toHaveBeenCalledWith('notificationsEnabled', false)
  })

  it('should disable preview and sound toggles when notifications disabled', async () => {
    const user = userEvent.setup()
    
    // Mock getSettings to return notifications disabled
    vi.mocked(window.settingsAPI.getSettings).mockResolvedValue({
      notificationsEnabled: false,
      showPreview: true,
      notificationSound: true,
      dndMode: false,
      theme: 'system',
      startMinimized: false,
      closeToTray: true,
      firstRun: false,
      failedShortcuts: [],
      sessionType: 'wayland'
    })
    
    render(<NotificationsTab />)
    
    const previewSwitch = screen.getByRole('switch', { name: /show message preview/i })
    const soundSwitch = screen.getByRole('switch', { name: /play notification sound/i })
    
    expect(previewSwitch).toBeDisabled()
    expect(soundSwitch).toBeDisabled()
  })

  it('should toggle show preview when clicked', async () => {
    const user = userEvent.setup()
    render(<NotificationsTab />)
    
    const previewSwitch = screen.getByRole('switch', { name: /show message preview/i })
    
    await user.click(previewSwitch)
    
    expect(window.settingsAPI.setSetting).toHaveBeenCalledWith('showPreview', false)
  })

  it('should toggle notification sound when clicked', async () => {
    const user = userEvent.setup()
    render(<NotificationsTab />)
    
    const soundSwitch = screen.getByRole('switch', { name: /play notification sound/i })
    
    await user.click(soundSwitch)
    
    expect(window.settingsAPI.setSetting).toHaveBeenCalledWith('notificationSound', false)
  })

  it('should toggle DND mode when clicked', async () => {
    const user = userEvent.setup()
    render(<NotificationsTab />)
    
    const dndSwitch = screen.getByRole('switch', { name: /enable do not disturb/i })
    
    await user.click(dndSwitch)
    
    expect(window.settingsAPI.setSetting).toHaveBeenCalledWith('dndMode', true)
  })

  it('should display OS sync tip', () => {
    render(<NotificationsTab />)
    
    expect(screen.getByText(/automatically syncs with your operating system's Do Not Disturb settings/i)).toBeInTheDocument()
  })

  it('should display keyboard shortcut hint', () => {
    render(<NotificationsTab />)
    
    expect(screen.getByText(/Ctrl\+Shift\+D/i)).toBeInTheDocument()
  })

  it('should show sync notification when DND changes from OS', async () => {
    let dndCallback: ((enabled: boolean) => void) | null = null
    
    // Capture the callback
    vi.mocked(window.settingsAPI.onDndChanged).mockImplementation((cb) => {
      dndCallback = cb
    })
    
    render(<NotificationsTab />)
    
    // Simulate OS DND change
    if (dndCallback) {
      dndCallback(true)
    }
    
    // Should show notification
    expect(await screen.findByText(/DND mode enabled \(synced with OS\)/i)).toBeInTheDocument()
  })

  it('should auto-dismiss sync notification after 3 seconds', async () => {
    vi.useFakeTimers()
    
    let dndCallback: ((enabled: boolean) => void) | null = null
    vi.mocked(window.settingsAPI.onDndChanged).mockImplementation((cb) => {
      dndCallback = cb
    })
    
    render(<NotificationsTab />)
    
    // Trigger DND change
    if (dndCallback) {
      dndCallback(true)
    }
    
    // Notification should be visible
    expect(await screen.findByText(/DND mode enabled/i)).toBeInTheDocument()
    
    // Fast-forward 3 seconds
    vi.advanceTimersByTime(3000)
    
    // Notification should disappear
    expect(screen.queryByText(/DND mode enabled/i)).not.toBeInTheDocument()
    
    vi.useRealTimers()
  })
})
