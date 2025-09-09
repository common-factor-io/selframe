import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Cloud, CloudOff, Download, Upload, Settings, User, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import googleCalendarService from '../lib/googleCalendar'

const GoogleCalendarSync = ({ events, onImportEvents, onExportComplete }) => {
  const [authStatus, setAuthStatus] = useState({
    isInitialized: false,
    isSignedIn: false,
    user: null
  })
  const [calendars, setCalendars] = useState([])
  const [selectedCalendar, setSelectedCalendar] = useState('primary')
  const [syncStatus, setSyncStatus] = useState({
    isExporting: false,
    isImporting: false,
    lastSync: null,
    exportCount: 0,
    importCount: 0
  })
  const [syncHistory, setSyncHistory] = useState([])
  const [showSettings, setShowSettings] = useState(false)

  // Initialize Google Calendar API on component mount
  useEffect(() => {
    initializeGoogleCalendar()
  }, [])

  const initializeGoogleCalendar = async () => {
    try {
      await googleCalendarService.initialize()
      const status = googleCalendarService.getSignInStatus()
      setAuthStatus(status)
      
      if (status.isSignedIn) {
        await loadCalendars()
      }
    } catch (error) {
      console.error('Failed to initialize Google Calendar:', error)
      addSyncHistoryItem('error', 'Failed to initialize Google Calendar API')
    }
  }

  const handleSignIn = async () => {
    try {
      const result = await googleCalendarService.signIn()
      if (result.success) {
        setAuthStatus({
          isInitialized: true,
          isSignedIn: true,
          user: result.user
        })
        await loadCalendars()
        addSyncHistoryItem('success', `Signed in as ${result.user.name}`)
      } else {
        addSyncHistoryItem('error', `Sign-in failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Sign-in error:', error)
      addSyncHistoryItem('error', 'Sign-in failed')
    }
  }

  const handleSignOut = async () => {
    try {
      const result = await googleCalendarService.signOut()
      if (result.success) {
        setAuthStatus({
          isInitialized: true,
          isSignedIn: false,
          user: null
        })
        setCalendars([])
        addSyncHistoryItem('info', 'Signed out from Google Calendar')
      }
    } catch (error) {
      console.error('Sign-out error:', error)
      addSyncHistoryItem('error', 'Sign-out failed')
    }
  }

  const loadCalendars = async () => {
    try {
      const calendarList = await googleCalendarService.getCalendarList()
      setCalendars(calendarList)
      
      // Auto-select primary calendar if available
      const primaryCalendar = calendarList.find(cal => cal.primary)
      if (primaryCalendar) {
        setSelectedCalendar(primaryCalendar.id)
      }
    } catch (error) {
      console.error('Failed to load calendars:', error)
      addSyncHistoryItem('error', 'Failed to load calendar list')
    }
  }

  const handleExportToGoogle = async () => {
    if (!authStatus.isSignedIn || events.length === 0) return

    setSyncStatus(prev => ({ ...prev, isExporting: true, exportCount: 0 }))
    
    try {
      let successCount = 0
      let errorCount = 0

      for (const event of events) {
        try {
          const result = await googleCalendarService.exportEventToGoogle(event, selectedCalendar)
          if (result.success) {
            successCount++
            setSyncStatus(prev => ({ ...prev, exportCount: successCount }))
          } else {
            errorCount++
          }
        } catch (error) {
          errorCount++
          console.error('Export error for event:', event.name, error)
        }
      }

      const now = new Date().toISOString()
      setSyncStatus(prev => ({
        ...prev,
        isExporting: false,
        lastSync: now,
        exportCount: successCount
      }))

      if (successCount > 0) {
        addSyncHistoryItem('success', `Exported ${successCount} events to Google Calendar`)
        onExportComplete?.(successCount)
      }
      
      if (errorCount > 0) {
        addSyncHistoryItem('warning', `${errorCount} events failed to export`)
      }

    } catch (error) {
      setSyncStatus(prev => ({ ...prev, isExporting: false }))
      addSyncHistoryItem('error', 'Export to Google Calendar failed')
      console.error('Export error:', error)
    }
  }

  const handleImportFromGoogle = async () => {
    if (!authStatus.isSignedIn) return

    setSyncStatus(prev => ({ ...prev, isImporting: true, importCount: 0 }))

    try {
      const result = await googleCalendarService.importEventsFromGoogle(selectedCalendar)
      
      if (result.success) {
        const now = new Date().toISOString()
        setSyncStatus(prev => ({
          ...prev,
          isImporting: false,
          lastSync: now,
          importCount: result.events.length
        }))

        if (result.events.length > 0) {
          onImportEvents(result.events)
          addSyncHistoryItem('success', `Imported ${result.events.length} events from Google Calendar`)
        } else {
          addSyncHistoryItem('info', 'No new events found to import')
        }
      } else {
        addSyncHistoryItem('error', `Import failed: ${result.error}`)
      }
    } catch (error) {
      setSyncStatus(prev => ({ ...prev, isImporting: false }))
      addSyncHistoryItem('error', 'Import from Google Calendar failed')
      console.error('Import error:', error)
    }
  }

  const handleTwoWaySync = async () => {
    await handleExportToGoogle()
    await new Promise(resolve => setTimeout(resolve, 1000)) // Brief pause
    await handleImportFromGoogle()
  }

  const addSyncHistoryItem = (type, message) => {
    const item = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toISOString()
    }
    setSyncHistory(prev => [item, ...prev.slice(0, 9)]) // Keep last 10 items
  }

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  const getSyncIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />
      default: return <RefreshCw className="w-4 h-4 text-blue-500" />
    }
  }

  if (!authStatus.isInitialized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Google Calendar Sync
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Initializing Google Calendar...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Google Calendar Sync
            {authStatus.isSignedIn && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Cloud className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Authentication Section */}
        {!authStatus.isSignedIn ? (
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <CloudOff className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <h3 className="font-medium text-gray-900 mb-2">Connect to Google Calendar</h3>
            <p className="text-sm text-gray-600 mb-4">
              Sync your Selframe activities with Google Calendar for seamless integration across all your devices.
            </p>
            <Button onClick={handleSignIn} className="bg-blue-600 hover:bg-blue-700">
              <Cloud className="w-4 h-4 mr-2" />
              Connect Google Calendar
            </Button>
          </div>
        ) : (
          <>
            {/* User Info */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                {authStatus.user?.imageUrl ? (
                  <img 
                    src={authStatus.user.imageUrl} 
                    alt={authStatus.user.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <User className="w-8 h-8 text-green-600" />
                )}
                <div>
                  <div className="font-medium text-green-900">{authStatus.user?.name}</div>
                  <div className="text-sm text-green-700">{authStatus.user?.email}</div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Disconnect
              </Button>
            </div>

            {/* Calendar Selection */}
            {showSettings && calendars.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Calendar
                </label>
                <select
                  value={selectedCalendar}
                  onChange={(e) => setSelectedCalendar(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                >
                  {calendars.map(calendar => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.name} {calendar.primary ? '(Primary)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sync Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={handleExportToGoogle}
                disabled={syncStatus.isExporting || events.length === 0}
                variant="outline"
                className="flex items-center gap-2"
              >
                {syncStatus.isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Export to Google
                {syncStatus.isExporting && (
                  <Badge variant="secondary" className="ml-1">
                    {syncStatus.exportCount}
                  </Badge>
                )}
              </Button>

              <Button
                onClick={handleImportFromGoogle}
                disabled={syncStatus.isImporting}
                variant="outline"
                className="flex items-center gap-2"
              >
                {syncStatus.isImporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Import from Google
              </Button>

              <Button
                onClick={handleTwoWaySync}
                disabled={syncStatus.isExporting || syncStatus.isImporting || events.length === 0}
                className="flex items-center gap-2"
              >
                {(syncStatus.isExporting || syncStatus.isImporting) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Two-way Sync
              </Button>
            </div>

            {/* Sync Status */}
            <div className="text-sm text-gray-600 text-center">
              Last sync: {formatLastSync(syncStatus.lastSync)}
            </div>

            {/* Sync History */}
            {syncHistory.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Recent Activity</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {syncHistory.map(item => (
                    <div key={item.id} className="flex items-start gap-2 text-xs p-2 bg-gray-50 rounded">
                      {getSyncIcon(item.type)}
                      <div className="flex-1">
                        <div className="text-gray-900">{item.message}</div>
                        <div className="text-gray-500">{new Date(item.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default GoogleCalendarSync
