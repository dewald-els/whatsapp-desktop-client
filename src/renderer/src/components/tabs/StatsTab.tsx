import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Clock,
  Bell,
  Power,
  Activity,
  Calendar,
  RotateCcw,
} from 'lucide-react'

interface UsageStats {
  totalSessions: number
  totalUsageTime: number
  totalNotifications: number
  appStartCount: number
  lastLaunch: string
  dailyStats: DailyStats[]
}

interface DailyStats {
  date: string
  sessionCount: number
  totalSessionDuration: number
  windowFocusCount: number
  notificationsSent: number
  settingsOpened: number
  dndToggleCount: number
}

export default function StatsTab() {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [recentStats, setRecentStats] = useState<DailyStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [daysToShow, setDaysToShow] = useState(7)
  
  console.log('StatsTab rendering, loading:', loading, 'stats:', stats)

  const loadStats = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('Loading stats...')
      const [allStats, recent] = await Promise.all([
        window.settingsAPI.getStats(),
        window.settingsAPI.getRecentStats(daysToShow)
      ])
      console.log('Stats loaded:', allStats)
      console.log('Recent stats:', recent)
      
      if (!allStats) {
        throw new Error('No stats data received')
      }
      
      setStats(allStats)
      setRecentStats(recent || [])
    } catch (err) {
      console.error('Failed to load stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [daysToShow])

  const handleReset = async () => {
    const confirmed = confirm(
      'Delete statistics data?\n\n' +
      'This will permanently delete your desktop app usage statistics:\n' +
      '• App usage history\n' +
      '• Daily activity records\n' +
      '• Session tracking data\n\n' +
      '✓ Your WhatsApp messages and chats are not affected\n' +
      '✓ Your WhatsApp account data is safe\n\n' +
      'Only desktop app statistics will be deleted.\n\n' +
      'This action cannot be undone. Continue?'
    )
    
    if (confirmed) {
      const success = await window.settingsAPI.resetStats()
      if (success) {
        alert('Desktop app statistics have been deleted.\n\nYour WhatsApp messages and data are unaffected.')
        loadStats()
      } else {
        alert('Failed to delete statistics. Please try again.')
      }
    }
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatRelativeDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    }
    return formatDate(dateStr)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading statistics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Statistics</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadStats}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
          <CardDescription>Unable to load statistics</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const avgSessionDuration = stats.totalSessions > 0 
    ? Math.floor(stats.totalUsageTime / stats.totalSessions)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Usage Statistics</h2>
          <p className="text-muted-foreground">
            Track your WhatsApp Desktop app usage and activity
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Desktop app stats only • Your WhatsApp messages are not tracked
          </p>
          <p className="text-xs text-muted-foreground">
            Data: ~/.local/share/whatsapp-desktop/usage-stats.json
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={handleReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Delete Statistics
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              App launched {stats.appStartCount} times
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.totalUsageTime)}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatDuration(avgSessionDuration)} per session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNotifications}</div>
            <p className="text-xs text-muted-foreground">
              Total notifications sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Launch</CardTitle>
            <Power className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDate(stats.lastLaunch)}</div>
            <p className="text-xs text-muted-foreground">
              {new Date(stats.lastLaunch).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Activity Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Daily Activity
              </CardTitle>
              <CardDescription>
                Your WhatsApp Desktop activity over time
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={daysToShow === 7 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDaysToShow(7)}
              >
                7 days
              </Button>
              <Button
                variant={daysToShow === 30 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDaysToShow(30)}
              >
                30 days
              </Button>
              <Button
                variant={daysToShow === 90 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDaysToShow(90)}
              >
                90 days
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No activity data yet. Start using WhatsApp Desktop to see your statistics!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Usage Time</TableHead>
                  <TableHead className="text-right">Notifications</TableHead>
                  <TableHead className="text-right">Window Focus</TableHead>
                  <TableHead className="text-right">Settings Opened</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentStats.reverse().map((day) => (
                  <TableRow key={day.date}>
                    <TableCell className="font-medium">
                      {formatRelativeDate(day.date)}
                    </TableCell>
                    <TableCell className="text-right">{day.sessionCount}</TableCell>
                    <TableCell className="text-right">
                      {formatDuration(day.totalSessionDuration)}
                    </TableCell>
                    <TableCell className="text-right">{day.notificationsSent}</TableCell>
                    <TableCell className="text-right">{day.windowFocusCount}</TableCell>
                    <TableCell className="text-right">{day.settingsOpened}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
