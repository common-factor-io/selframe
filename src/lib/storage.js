// Enhanced storage utilities for mental health events

const STORAGE_KEY = 'mentalHealthEvents'
const BACKUP_KEY = 'mentalHealthEvents_backup'

// Enhanced localStorage with error handling and backup
export const StorageManager = {
  // Save events with backup
  saveEvents: (events) => {
    try {
      // Create backup of current data before saving new
      const currentData = localStorage.getItem(STORAGE_KEY)
      if (currentData) {
        localStorage.setItem(BACKUP_KEY, currentData)
      }
      
      // Save new data
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
      return { success: true }
    } catch (error) {
      console.error('Failed to save events:', error)
      return { success: false, error: error.message }
    }
  },

  // Load events with fallback to backup
  loadEvents: () => {
    try {
      const savedEvents = localStorage.getItem(STORAGE_KEY)
      if (savedEvents) {
        return JSON.parse(savedEvents)
      }
      return []
    } catch (error) {
      console.error('Failed to load events, trying backup:', error)
      try {
        const backupEvents = localStorage.getItem(BACKUP_KEY)
        if (backupEvents) {
          return JSON.parse(backupEvents)
        }
      } catch (backupError) {
        console.error('Backup also failed:', backupError)
      }
      return []
    }
  },

  // Export events as JSON file
  exportEvents: (events) => {
    try {
      const dataStr = JSON.stringify(events, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `mental-health-events-${new Date().toISOString().split('T')[0]}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
      
      return { success: true, filename: exportFileDefaultName }
    } catch (error) {
      console.error('Failed to export events:', error)
      return { success: false, error: error.message }
    }
  },

  // Import events from JSON file
  importEvents: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const events = JSON.parse(e.target.result)
          // Validate the imported data structure
          if (Array.isArray(events) && events.every(event => 
            event.id && event.name && event.category && event.date
          )) {
            resolve(events)
          } else {
            reject(new Error('Invalid file format'))
          }
        } catch (error) {
          reject(new Error('Failed to parse JSON file'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  },

  // Get storage info
  getStorageInfo: () => {
    try {
      const events = StorageManager.loadEvents()
      const dataSize = JSON.stringify(events).length
      const hasBackup = localStorage.getItem(BACKUP_KEY) !== null
      
      return {
        eventCount: events.length,
        dataSize: dataSize,
        dataSizeFormatted: formatBytes(dataSize),
        hasBackup,
        lastModified: events.length > 0 ? Math.max(...events.map(e => e.id)) : null
      }
    } catch (error) {
      return {
        eventCount: 0,
        dataSize: 0,
        dataSizeFormatted: '0 B',
        hasBackup: false,
        lastModified: null,
        error: error.message
      }
    }
  },

  // Clear all data (with confirmation)
  clearAllData: () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(BACKUP_KEY)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// Database upgrade options (for future implementation)
export const DatabaseOptions = {
  // Option 1: IndexedDB (browser database)
  indexedDB: {
    name: 'IndexedDB',
    description: 'Browser-based database with more storage space and better performance',
    pros: ['More storage space', 'Better performance', 'Structured queries', 'Offline support'],
    cons: ['More complex setup', 'Browser-only'],
    implementation: 'Can store much larger datasets and provides better querying capabilities'
  },

  // Option 2: Firebase (Google's cloud database)
  firebase: {
    name: 'Firebase Firestore',
    description: 'Cloud database with real-time sync and multi-device access',
    pros: ['Cloud storage', 'Multi-device sync', 'Real-time updates', 'Backup included'],
    cons: ['Requires internet', 'Google account needed', 'Usage limits on free tier'],
    implementation: 'Perfect for accessing your data from multiple devices'
  },

  // Option 3: Supabase (open-source alternative)
  supabase: {
    name: 'Supabase',
    description: 'Open-source alternative to Firebase with PostgreSQL',
    pros: ['Open source', 'PostgreSQL database', 'Real-time features', 'Good free tier'],
    cons: ['Requires internet', 'Account setup needed'],
    implementation: 'Great for more control and SQL-based queries'
  },

  // Option 4: Local JSON files
  jsonFiles: {
    name: 'JSON File Export/Import',
    description: 'Export to JSON files for manual backup and sharing',
    pros: ['Full control', 'Easy backup', 'Portable', 'No dependencies'],
    cons: ['Manual process', 'No automatic sync'],
    implementation: 'Already implemented above - use export/import functions'
  }
}
