import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { X, Download, Upload, Database } from 'lucide-react'
import Charts from './components/Charts'
import Calendar from './components/Calendar'
import { StorageManager } from './lib/storage'

// Helper function to convert HH:MM duration to minutes
const durationToMinutes = (duration) => {
  if (!duration) return 60; // Default to 1 hour if no duration
  const [hours, minutes] = duration.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper function to convert reach value + unit to days
const reachToDays = (reachValue, reachUnit) => {
  const value = Number(reachValue) || 1;
  switch (reachUnit) {
    case 'days': return value;
    case 'weeks': return value * 7;
    case 'months': return value * 30; // approximate
    case 'years': return value * 365;
    default: return value; // default to days
  }
}

// Helper function to calculate impact from duration and reach
// Formula: impact = 1 / (duration_in_minutes / reach_in_days)
const calculateImpact = (duration, isAllDay, reachValue, reachUnit) => {
  const durationMinutes = isAllDay ? (8 * 60) : durationToMinutes(duration); // 8 hours for all-day
  const reachDays = reachToDays(reachValue, reachUnit);
  
  if (durationMinutes === 0) return 0;
  const impact = 1 / (durationMinutes / reachDays);
  
  return impact.toFixed(2);
}

// Helper function to calculate ripple score
// Formula: RS = Impact * log(1 + Duration) * f(Reach)
const calculateRippleScore = (impact, duration, isAllDay, reachValue, reachUnit) => {
  const durationMinutes = isAllDay ? (8 * 60) : durationToMinutes(duration); // 8 hours for all-day
  const reachDays = reachToDays(reachValue, reachUnit);
  
  // RS = Impact * log(1 + Duration) * f(Reach)
  const rippleScore = impact * Math.log(1 + durationMinutes) * reachDays;
  
  return rippleScore.toFixed(1);
}

function App() {
  const [events, setEvents] = useState([])
  const [storageInfo, setStorageInfo] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    category: 'therapy',
    date: new Date().toISOString().split('T')[0],
    duration: '01:00',
    isAllDay: false,
    impact: 5,
    reachValue: 1,
    reachUnit: 'days'
  })

  // Load events from storage on component mount
  useEffect(() => {
    const savedEvents = StorageManager.loadEvents()
    setEvents(savedEvents)
    setStorageInfo(StorageManager.getStorageInfo())
  }, [])

  // Save events to storage whenever events change
  useEffect(() => {
    if (events.length > 0) { // Only save if there are events to avoid overwriting with empty array on initial load
      StorageManager.saveEvents(events)
      setStorageInfo(StorageManager.getStorageInfo())
    }
  }, [events])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCategoryChange = (value) => {
    setFormData(prev => ({
      ...prev,
      category: value
    }))
  }

  const handleAllDayToggle = (checked) => {
    setFormData(prev => ({
      ...prev,
      isAllDay: checked
    }))
  }

  const handleReachValueChange = (e) => {
    setFormData(prev => ({
      ...prev,
      reachValue: e.target.value
    }))
  }

  const handleReachUnitChange = (value) => {
    setFormData(prev => ({
      ...prev,
      reachUnit: value
    }))
  }

  const handleImpactChange = (value) => {
    setFormData(prev => ({
      ...prev,
      impact: value[0]
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (formData.name.trim()) {
      const rippleScore = calculateRippleScore(
        formData.impact, 
        formData.duration, 
        formData.isAllDay, 
        formData.reachValue, 
        formData.reachUnit
      )
      const newEvent = {
        id: Date.now(),
        ...formData,
        rippleScore: parseFloat(rippleScore)
      }
      setEvents(prev => [newEvent, ...prev])
      setFormData({
        name: '',
        category: 'therapy',
        date: new Date().toISOString().split('T')[0],
        duration: '01:00',
        isAllDay: false,
        impact: 5,
        reachValue: 1,
        reachUnit: 'days'
      })
    }
  }

  const deleteEvent = (id) => {
    setEvents(prev => prev.filter(event => event.id !== id))
  }

  // Export events to JSON file
  const handleExportEvents = () => {
    const result = StorageManager.exportEvents(events)
    if (result.success) {
      alert(`Events exported successfully as ${result.filename}`)
    } else {
      alert(`Export failed: ${result.error}`)
    }
  }

  // Import events from JSON file
  const handleImportEvents = (event) => {
    const file = event.target.files[0]
    if (file) {
      StorageManager.importEvents(file)
        .then(importedEvents => {
          const confirmMessage = `Import ${importedEvents.length} events? This will add to your existing ${events.length} events.`
          if (window.confirm(confirmMessage)) {
            // Merge imported events with existing ones, avoiding duplicates
            const existingIds = new Set(events.map(e => e.id))
            const newEvents = importedEvents.filter(e => !existingIds.has(e.id))
            setEvents(prev => [...newEvents, ...prev])
            alert(`Successfully imported ${newEvents.length} new events`)
          }
        })
        .catch(error => {
          alert(`Import failed: ${error.message}`)
        })
    }
    // Reset file input
    event.target.value = ''
  }

  // Clear all data
  const handleClearAllData = () => {
    const confirmMessage = `⚠️ Are you sure you want to delete ALL ${events.length} events? This action cannot be undone.`
    if (window.confirm(confirmMessage)) {
      const doubleConfirm = window.confirm('This will permanently delete all your mental health data. Are you absolutely sure?')
      if (doubleConfirm) {
        setEvents([])
        StorageManager.clearAllData()
        alert('All data has been cleared successfully.')
      }
    }
  }

  const getCategoryVariant = (category) => {
    switch (category) {
      case 'therapy': return 'secondary'
      case 'exercise': return 'default'
      case 'quality time': return 'outline'
      default: return 'secondary'
    }
  }

  const getCategoryColor = (category) => {
    switch (category) {
      case 'therapy': return 'bg-purple-100 text-purple-800 hover:bg-purple-200'
      case 'exercise': return 'bg-green-100 text-green-800 hover:bg-green-200'
      case 'quality time': return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    }
  }

  // Generate dummy data function
  const generateDummyData = () => {
    const categories = ['therapy', 'exercise', 'quality time']
    const activityNames = {
      therapy: [
        'Meditation session', 'Therapy appointment', 'Journaling', 'Breathing exercises', 
        'Self-reflection time', 'Mindfulness practice', 'Reading self-help book', 'Gratitude practice',
        'Progressive muscle relaxation', 'Emotional check-in', 'Anxiety management', 'CBT exercises'
      ],
      exercise: [
        'Morning run', 'Gym workout', 'Yoga class', 'Swimming', 'Cycling', 'Weight training',
        'Pilates session', 'Dance class', 'Rock climbing', 'Tennis match', 'Basketball game',
        'Walking in nature', 'Hiking', 'Stretching routine', 'Cardio workout'
      ],
      'quality time': [
        'Coffee with friend', 'Family dinner', 'Movie night', 'Game night', 'Video call with loved ones',
        'Date night', 'Volunteer work', 'Community event', 'Book club meeting', 'Art class',
        'Cooking together', 'Picnic in park', 'Concert or show', 'Museum visit', 'Beach day'
      ]
    }
    
    const reachUnits = ['days', 'weeks', 'months']
    const durations = ['00:30', '01:00', '01:30', '02:00', '02:30', '03:00']
    
    const dummyEvents = []
    const now = new Date()
    const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000))
    
    // Generate approximately 2 events per week for one year (104 events)
    const totalEvents = 104
    
    for (let i = 0; i < totalEvents; i++) {
      // Random date within the last year
      const randomTime = oneYearAgo.getTime() + Math.random() * (now.getTime() - oneYearAgo.getTime())
      const randomDate = new Date(randomTime).toISOString().split('T')[0]
      
      // Random category and corresponding activity name
      const category = categories[Math.floor(Math.random() * categories.length)]
      const names = activityNames[category]
      const name = names[Math.floor(Math.random() * names.length)]
      
      // Random duration or all day (10% chance for all day)
      const isAllDay = Math.random() < 0.1
      const duration = isAllDay ? '01:00' : durations[Math.floor(Math.random() * durations.length)]
      
      // Random impact (1-10, weighted towards middle values)
      const impact = Math.max(1, Math.min(10, Math.round(Math.random() * 4 + Math.random() * 4 + 2)))
      
      // Random reach
      const reachValue = Math.floor(Math.random() * 10) + 1
      const reachUnit = reachUnits[Math.floor(Math.random() * reachUnits.length)]
      
      // Calculate ripple score
      const rippleScore = calculateRippleScore(impact, duration, isAllDay, reachValue, reachUnit)
      
      const event = {
        id: Date.now() + i, // Ensure unique IDs
        name,
        category,
        date: randomDate,
        duration,
        isAllDay,
        impact,
        reachValue,
        reachUnit,
        rippleScore: parseFloat(rippleScore)
      }
      
      dummyEvents.push(event)
    }
    
    // Sort by date (newest first) and add to existing events
    dummyEvents.sort((a, b) => new Date(b.date) - new Date(a.date))
    setEvents(prev => [...dummyEvents, ...prev])
  }

  return (
    <div className="min-h-screen bg-stone-100 from-blue-50 to-indigo-100 p-4 pt-10">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🎯 Selframe</h1>
          <p className="text-gray-600">Frame your mental health journey with intention</p>
        </header>

                 <div className="grid xl:grid-cols-3 lg:grid-cols-2 gap-6">
           {/* Add Activity Form */}
           <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ➕ Add New Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Activity Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Morning meditation, Gym session, Coffee with friend"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={handleCategoryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="therapy">Therapy</SelectItem>
                      <SelectItem value="exercise">Exercise</SelectItem>
                      <SelectItem value="quality time">Quality Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <div className="flex items-center gap-3 mt-0">
                    <Input
                      id="duration"
                      name="duration"
                      type="time"
                      value={formData.duration}
                      onChange={handleInputChange}
                      disabled={formData.isAllDay}
                      className="flex-1"
                    />
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="all-day"
                        checked={formData.isAllDay}
                        onCheckedChange={handleAllDayToggle}
                      />
                      <Label htmlFor="all-day" className="text-sm">All day</Label>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    How long did this activity take?
                  </p>
                </div>
                </div>

                                 <div>
                   <Label htmlFor="reach">How long will the benefits last?</Label>
                   <div className="flex items-center gap-2 mt-2">
                     <Input
                       id="reachValue"
                       name="reachValue"
                       type="number"
                       min="1"
                       value={formData.reachValue}
                       onChange={handleReachValueChange}
                       className="flex-1"
                     />
                     <Select value={formData.reachUnit} onValueChange={handleReachUnitChange}>
                       <SelectTrigger className="w-24">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="days">days</SelectItem>
                         <SelectItem value="weeks">weeks</SelectItem>
                         <SelectItem value="months">months</SelectItem>
                         <SelectItem value="years">years</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   <p className="text-xs text-muted-foreground mt-1">
                     How long you expect the mental health benefits to last
                   </p>
                 </div>

                 <div>
                   <Label htmlFor="impact">Impact (1-10): {formData.impact}</Label>
                   <Slider
                     id="impact"
                     min={1}
                     max={10}
                     step={1}
                     value={[formData.impact]}
                     onValueChange={handleImpactChange}
                     className="w-full mt-2"
                   />
                   <div className="flex justify-between text-sm text-gray-500 mt-1">
                     <span>1</span>
                     <span>10</span>
                   </div>
                   <p className="text-xs text-muted-foreground mt-1">
                     How impactful was this activity for your mental health?
                   </p>
                 </div>

                <Button type="submit" className="w-full">
                  Add Activity
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Calendar View */}
           <div className="lg:col-span-2">
             <Calendar events={events} onDeleteEvent={deleteEvent} />
           </div>
           

           {/* Data Management Section */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <Database className="h-5 w-5" />
                   Data Management & Backup
                 </div>
                 <Badge variant="outline" className="text-xs">
                   {events.length} total events
                 </Badge>
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-4">
                 {/* Storage Info */}
                 {storageInfo && (
                   <div className="bg-gray-50 p-3 rounded-lg">
                     <div className="grid grid-cols-2 gap-4 text-sm">
                       <div>
                         <span className="font-medium">Events:</span> {storageInfo.eventCount}
                       </div>
                       <div>
                         <span className="font-medium">Data Size:</span> {storageInfo.dataSizeFormatted}
                       </div>
                       <div>
                         <span className="font-medium">Backup:</span> {storageInfo.hasBackup ? '✅ Available' : '❌ None'}
                       </div>
                       <div>
                         <span className="font-medium">Auto-Save:</span> ✅ Enabled
                       </div>
                     </div>
                   </div>
                 )}

                 {/* Export/Import Buttons */}
                 <div className="flex gap-2 flex-wrap">
                   <Button 
                     onClick={handleExportEvents}
                     variant="outline"
                     size="sm"
                     className="flex items-center gap-2"
                     disabled={events.length === 0}
                   >
                     <Download className="h-4 w-4" />
                     Export Events
                   </Button>
                   
                   <Button 
                     as="label"
                     variant="outline"
                     size="sm"
                     className="flex items-center gap-2 cursor-pointer"
                   >
                     <Upload className="h-4 w-4" />
                     Import Events
                     <input
                       type="file"
                       accept=".json"
                       onChange={handleImportEvents}
                       className="hidden"
                     />
                   </Button>
                 </div>

                 {/* Quick Actions */}
                 <div className="border-t pt-4">
                   <div className="text-sm font-medium mb-3">Quick Actions</div>
                   <div className="flex gap-2 flex-wrap">
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={generateDummyData}
                       className="flex items-center gap-2"
                     >
                       🎲 Add Dummy Data
                     </Button>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={handleClearAllData}
                       className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                       disabled={events.length === 0}
                     >
                       🗑️ Clear All Data
                     </Button>
                   </div>
                   {events.length === 0 && (
                     <div className="text-center py-4 mt-3">
                       <div className="text-4xl mb-2">🌱</div>
                       <p className="text-gray-500 text-sm">No activities yet. Add your first event using the form above!</p>
                     </div>
                   )}
                 </div>

                 <div className="text-xs text-gray-500">
                   <p>✅ <strong>Your events are automatically saved</strong> to your browser's local storage.</p>
                   <p>💾 Use Export to create backups or share your data.</p>
                   <p>📱 Data is stored locally - won't sync between devices.</p>
                 </div>
               </div>
             </CardContent>
           </Card>

           {/* Charts Section */}
           <div className="xl:col-span-1 lg:col-span-2">
             <Charts events={events} />
           </div>
         </div>
       </div>
     </div>
   )
 }

export default App