/**
 * Google Calendar Integration Service
 * Handles OAuth authentication and two-way sync with Google Calendar
 */

// Google Calendar API configuration
const GOOGLE_CONFIG = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
  discoveryDoc: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
  scopes: 'https://www.googleapis.com/auth/calendar'
}

// Check if Google Calendar integration is properly configured
const isGoogleCalendarConfigured = () => {
  return !!(GOOGLE_CONFIG.clientId && 
           GOOGLE_CONFIG.apiKey && 
           GOOGLE_CONFIG.clientId !== 'your-google-client-id' &&
           GOOGLE_CONFIG.apiKey !== 'your-google-api-key')
}

class GoogleCalendarService {
  constructor() {
    this.gapi = null
    this.isInitialized = false
    this.isSignedIn = false
    this.authInstance = null
  }

  /**
   * Initialize Google API and load Calendar API
   */
  async initialize() {
    if (this.isInitialized) return true

    // Check if Google Calendar is properly configured
    if (!isGoogleCalendarConfigured()) {
      console.warn('Google Calendar integration not configured. Please set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY environment variables.')
      throw new Error('Google Calendar not configured')
    }

    try {
      // Load Google API script if not already loaded
      if (!window.gapi) {
        await this.loadGoogleAPI()
      }

      this.gapi = window.gapi

      // Initialize the API
      await new Promise((resolve, reject) => {
        this.gapi.load('auth2:client', {
          callback: resolve,
          onerror: reject
        })
      })

      // Initialize the client
      await this.gapi.client.init({
        apiKey: GOOGLE_CONFIG.apiKey,
        clientId: GOOGLE_CONFIG.clientId,
        discoveryDocs: [GOOGLE_CONFIG.discoveryDoc],
        scope: GOOGLE_CONFIG.scopes
      })

      this.authInstance = this.gapi.auth2.getAuthInstance()
      this.isSignedIn = this.authInstance.isSignedIn.get()
      this.isInitialized = true

      return true
    } catch (error) {
      console.error('Failed to initialize Google Calendar API:', error)
      throw new Error('Google Calendar initialization failed: ' + error.message)
    }
  }

  /**
   * Load Google API script dynamically
   */
  loadGoogleAPI() {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://apis.google.com/js/api.js'
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  /**
   * Sign in to Google Calendar
   */
  async signIn() {
    await this.initialize()
    
    try {
      const authResult = await this.authInstance.signIn()
      this.isSignedIn = true
      return {
        success: true,
        user: {
          name: authResult.getBasicProfile().getName(),
          email: authResult.getBasicProfile().getEmail(),
          imageUrl: authResult.getBasicProfile().getImageUrl()
        }
      }
    } catch (error) {
      console.error('Google Calendar sign-in failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Sign out from Google Calendar
   */
  async signOut() {
    if (!this.authInstance) return

    try {
      await this.authInstance.signOut()
      this.isSignedIn = false
      return { success: true }
    } catch (error) {
      console.error('Google Calendar sign-out failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get user's Google Calendars
   */
  async getCalendarList() {
    if (!this.isSignedIn) throw new Error('Not signed in to Google Calendar')

    try {
      const response = await this.gapi.client.calendar.calendarList.list({
        minAccessRole: 'writer'
      })

      return response.result.items.map(calendar => ({
        id: calendar.id,
        name: calendar.summary,
        description: calendar.description,
        primary: calendar.primary || false,
        accessRole: calendar.accessRole
      }))
    } catch (error) {
      console.error('Failed to get calendar list:', error)
      throw error
    }
  }

  /**
   * Export Selframe event to Google Calendar
   */
  async exportEventToGoogle(selframeEvent, calendarId = 'primary') {
    if (!this.isSignedIn) throw new Error('Not signed in to Google Calendar')

    try {
      // Convert Selframe event to Google Calendar format
      const googleEvent = this.convertSelframeToGoogle(selframeEvent)
      
      const response = await this.gapi.client.calendar.events.insert({
        calendarId: calendarId,
        resource: googleEvent
      })

      return {
        success: true,
        googleEventId: response.result.id,
        event: response.result
      }
    } catch (error) {
      console.error('Failed to export event to Google Calendar:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Import events from Google Calendar
   */
  async importEventsFromGoogle(calendarId = 'primary', timeMin = null, timeMax = null) {
    if (!this.isSignedIn) throw new Error('Not signed in to Google Calendar')

    try {
      const params = {
        calendarId: calendarId,
        timeMin: timeMin || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ahead
        singleEvents: true,
        orderBy: 'startTime'
      }

      const response = await this.gapi.client.calendar.events.list(params)
      
      // Convert Google Calendar events to Selframe format
      const selframeEvents = response.result.items
        .filter(event => event.start && (event.start.dateTime || event.start.date))
        .map(event => this.convertGoogleToSelframe(event))

      return {
        success: true,
        events: selframeEvents,
        totalCount: response.result.items.length
      }
    } catch (error) {
      console.error('Failed to import events from Google Calendar:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Convert Selframe event to Google Calendar format
   */
  convertSelframeToGoogle(selframeEvent) {
    const eventDate = new Date(selframeEvent.date)
    
    let start, end
    
    if (selframeEvent.isAllDay) {
      // All-day event
      start = { date: selframeEvent.date }
      end = { date: selframeEvent.date }
    } else {
      // Timed event
      const [hours, minutes] = selframeEvent.duration.split(':')
      const startTime = new Date(eventDate)
      const endTime = new Date(eventDate)
      endTime.setHours(endTime.getHours() + parseInt(hours))
      endTime.setMinutes(endTime.getMinutes() + parseInt(minutes))
      
      start = { dateTime: startTime.toISOString() }
      end = { dateTime: endTime.toISOString() }
    }

    return {
      summary: `${selframeEvent.name} (Selframe)`,
      description: this.generateEventDescription(selframeEvent),
      start: start,
      end: end,
      colorId: this.getCategoryColorId(selframeEvent.category),
      extendedProperties: {
        private: {
          selframeId: selframeEvent.id.toString(),
          selframeCategory: selframeEvent.category,
          selframeImpact: selframeEvent.impact.toString(),
          selframeReachValue: selframeEvent.reachValue.toString(),
          selframeReachUnit: selframeEvent.reachUnit,
          selframeRippleScore: selframeEvent.rippleScore.toString()
        }
      }
    }
  }

  /**
   * Convert Google Calendar event to Selframe format
   */
  convertGoogleToSelframe(googleEvent) {
    // Check if this is a Selframe-originated event
    const isSelframeEvent = googleEvent.extendedProperties?.private?.selframeId

    const eventDate = googleEvent.start.date || googleEvent.start.dateTime.split('T')[0]
    
    let duration = '01:00'
    let isAllDay = !!googleEvent.start.date

    if (!isAllDay && googleEvent.start.dateTime && googleEvent.end.dateTime) {
      const start = new Date(googleEvent.start.dateTime)
      const end = new Date(googleEvent.end.dateTime)
      const durationMs = end - start
      const hours = Math.floor(durationMs / (1000 * 60 * 60))
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
      duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    }

    return {
      id: isSelframeEvent ? parseInt(googleEvent.extendedProperties.private.selframeId) : Date.now() + Math.random(),
      name: googleEvent.summary?.replace(' (Selframe)', '') || 'Imported Event',
      category: isSelframeEvent ? googleEvent.extendedProperties.private.selframeCategory : this.inferCategoryFromEvent(googleEvent),
      date: eventDate,
      duration: duration,
      isAllDay: isAllDay,
      impact: isSelframeEvent ? parseInt(googleEvent.extendedProperties.private.selframeImpact) : this.inferImpactFromEvent(googleEvent),
      reachValue: isSelframeEvent ? parseInt(googleEvent.extendedProperties.private.selframeReachValue) : 1,
      reachUnit: isSelframeEvent ? googleEvent.extendedProperties.private.selframeReachUnit : 'days',
      rippleScore: isSelframeEvent ? parseFloat(googleEvent.extendedProperties.private.selframeRippleScore) : 50,
      googleEventId: googleEvent.id,
      importedFromGoogle: !isSelframeEvent
    }
  }

  /**
   * Generate event description for Google Calendar
   */
  generateEventDescription(selframeEvent) {
    return `Mental Health Activity from Selframe

Category: ${selframeEvent.category}
Impact Score: ${selframeEvent.impact}/10
Reach: ${selframeEvent.reachValue} ${selframeEvent.reachUnit}
Ripple Score: ${selframeEvent.rippleScore.toFixed(1)}

This event was created in Selframe to track mental health activities and their impact over time.`
  }

  /**
   * Get Google Calendar color ID for Selframe categories
   */
  getCategoryColorId(category) {
    const colorMap = {
      'therapy': '9', // Purple
      'exercise': '10', // Green
      'quality time': '7' // Blue
    }
    return colorMap[category] || '1' // Default blue
  }

  /**
   * Infer Selframe category from Google Calendar event
   */
  inferCategoryFromEvent(googleEvent) {
    const title = googleEvent.summary?.toLowerCase() || ''
    const description = googleEvent.description?.toLowerCase() || ''
    const combined = title + ' ' + description

    if (combined.includes('therapy') || combined.includes('counseling') || combined.includes('meditation') || combined.includes('mindfulness')) {
      return 'therapy'
    }
    if (combined.includes('gym') || combined.includes('workout') || combined.includes('exercise') || combined.includes('run') || combined.includes('yoga')) {
      return 'exercise'
    }
    if (combined.includes('friend') || combined.includes('family') || combined.includes('dinner') || combined.includes('coffee') || combined.includes('social')) {
      return 'quality time'
    }
    
    return 'therapy' // Default category
  }

  /**
   * Infer impact score from Google Calendar event
   */
  inferImpactFromEvent(googleEvent) {
    // Simple heuristic based on event duration and type
    const duration = this.getEventDurationHours(googleEvent)
    
    if (duration >= 2) return 7 // Long events likely high impact
    if (duration >= 1) return 5 // Medium events
    return 3 // Short events
  }

  /**
   * Get event duration in hours
   */
  getEventDurationHours(googleEvent) {
    if (googleEvent.start.date) return 24 // All-day event
    
    if (googleEvent.start.dateTime && googleEvent.end.dateTime) {
      const start = new Date(googleEvent.start.dateTime)
      const end = new Date(googleEvent.end.dateTime)
      return (end - start) / (1000 * 60 * 60)
    }
    
    return 1 // Default 1 hour
  }

  /**
   * Check if Google Calendar is available and configured
   */
  isAvailable() {
    return isGoogleCalendarConfigured()
  }

  /**
   * Check if user is signed in
   */
  getSignInStatus() {
    return {
      isAvailable: this.isAvailable(),
      isInitialized: this.isInitialized,
      isSignedIn: this.isSignedIn,
      user: this.isSignedIn && this.authInstance ? {
        name: this.authInstance.currentUser.get().getBasicProfile().getName(),
        email: this.authInstance.currentUser.get().getBasicProfile().getEmail(),
        imageUrl: this.authInstance.currentUser.get().getBasicProfile().getImageUrl()
      } : null
    }
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService()
export default googleCalendarService
