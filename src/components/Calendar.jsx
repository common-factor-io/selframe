import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, X } from 'lucide-react'

const Calendar = ({ events, onDeleteEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [heatmapMode, setHeatmapMode] = useState(false)
  const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 })
  const [modalDay, setModalDay] = useState(null)

  // Helper function to get category color
  const getCategoryColor = (category) => {
    switch (category) {
      case 'therapy': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'exercise': return 'bg-green-100 text-green-800 border-green-200'
      case 'quality time': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Helper function to get category dot color
  const getCategoryDotColor = (category) => {
    switch (category) {
      case 'therapy': return 'bg-purple-500'
      case 'exercise': return 'bg-green-500'
      case 'quality time': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  // Helper function to convert reach to days
  const reachToDays = (reachValue, reachUnit) => {
    const value = Number(reachValue) || 1
    switch (reachUnit) {
      case 'days': return value
      case 'weeks': return value * 7
      case 'months': return value * 30
      case 'years': return value * 365
      default: return value
    }
  }

  // Helper function to calculate Gaussian influence
  const gaussianInfluence = (daysDiff, sigma) => {
    return Math.exp(-0.5 * Math.pow(daysDiff / sigma, 2))
  }

  // Calculate intuitive mental health score with proper decay
  const calculateDayInfluence = (date, events) => {
    const targetDate = new Date(date)
    const dateString = targetDate.toISOString().split('T')[0]
    
    // 1. Calculate DIRECT impact from events happening on this exact day
    const dayEvents = events.filter(event => event.date === dateString)
    let directScore = 0
    const directEvents = []
    
    dayEvents.forEach(event => {
      // Direct impact: impact * 10 to get percentage (impact 10 = 100%, impact 5 = 50%)
      let eventScore = event.impact * 10
      
      // Duration bonus (small)
      if (event.isAllDay) {
        eventScore *= 1.1 // 10% bonus for all-day activities
      } else {
        const duration = event.duration || '01:00'
        const [hours, minutes] = duration.split(':').map(Number)
        const totalMinutes = hours * 60 + minutes
        if (totalMinutes >= 120) eventScore *= 1.05 // 5% bonus for 2+ hour activities
      }
      
      directScore += eventScore
      directEvents.push({
        name: event.name,
        impact: event.impact,
        score: eventScore.toFixed(1)
      })
    })
    
    // Cap multiple events: diminishing returns after 100%
    if (directScore > 100) {
      // Logarithmic scaling above 100%: log₂(score/100) * 20 + 100
      directScore = 100 + (Math.log2(directScore / 100) * 15)
      directScore = Math.min(directScore, 120) // Hard cap at 120%
    }

    // 2. Calculate REACH effects with proper logarithmic decay
    let reachScore = 0
    let reachContributions = []
    
    events.forEach(event => {
      const eventDate = new Date(event.date)
      const daysDiff = (targetDate - eventDate) / (1000 * 60 * 60 * 24) // Don't use Math.abs
      
      // Skip events on the same day (already counted in direct impact)
      if (daysDiff === 0) return
      
      // Skip events in the future - reach only extends forward from event date
      if (daysDiff < 0) return
      
      const reachDays = reachToDays(event.reachValue, event.reachUnit)
      
      // Only calculate reach influence if within forward range
      if (daysDiff > 0 && daysDiff <= reachDays) {
        // Much more aggressive decay: reach effects should be subtle
        // Day 1 = ~20%, Day 7 = ~5%, Day 30 = ~1%, Day 365 = ~0.1%
        const decayFactor = Math.pow(0.2, daysDiff / (reachDays * 0.2))
        const reachEffect = event.impact * 10 * decayFactor * 0.3 // Further reduce reach impact
        reachScore += reachEffect
        
        // Store reach contributions for tooltip
        if (reachEffect > 0.5) { // Only show significant contributions
          reachContributions.push({
            name: event.name,
            date: event.date,
            daysDiff: Math.round(daysDiff),
            effect: reachEffect.toFixed(1),
            impact: event.impact
          })
        }
      }
    })

    // 3. Combine direct + reach scores properly
    let totalScore
    
    if (directScore > 0) {
      // Day has events: direct score is primary, reach adds small bonus
      // But ensure days with events always score higher than days without
      totalScore = Math.max(directScore, reachScore * 1.2)
    } else {
      // Day has no events: use only reach effects (should be much lower)
      totalScore = reachScore
    }
    
    // Return detailed breakdown for tooltip
    return {
      total: totalScore,
      direct: directScore,
      reach: reachScore,
      directEvents: directEvents,
      reachContributions: reachContributions.sort((a, b) => parseFloat(b.effect) - parseFloat(a.effect)) // Sort by effect size
    }
  }

  // Simple pass-through normalization since scores are already 0-120%
  const normalizeInfluenceScore = (rawScore, allRawScores) => {
    // Scores are already calculated as percentages, just round and cap at 100%
    return Math.min(100, Math.round(rawScore))
  }

  // Get heatmap color based on influence score (0-100 scale)
  const getHeatmapColor = (influence) => {
    if (influence === 0) return 'bg-gray-50 border-gray-200'
    
    if (influence < 20) return 'bg-red-50 border-red-200' // Very low - needs attention
    if (influence < 40) return 'bg-red-100 border-red-200' // Low
    if (influence < 60) return 'bg-orange-100 border-orange-200' // Below average
    if (influence < 80) return 'bg-yellow-100 border-yellow-200' // Average
    if (influence < 95) return 'bg-green-100 border-green-200' // Good
    return 'bg-green-200 border-green-300' // Excellent
  }

  // Get heatmap text color for contrast (0-100 scale)
  const getHeatmapTextColor = (influence) => {
    if (influence === 0) return 'text-gray-400'
    
    if (influence < 20) return 'text-red-600'
    if (influence < 40) return 'text-red-700'
    if (influence < 60) return 'text-orange-700'
    if (influence < 80) return 'text-yellow-700'
    if (influence < 95) return 'text-green-700'
    return 'text-green-800'
  }

  // Generate detailed tooltip for heatmap mode
  const getDetailedTooltip = (day) => {
    if (!day.influenceBreakdown) return `Selframe Score: ${day.influenceScore || 0}%`
    
    const breakdown = day.influenceBreakdown
    const lines = []
    
    // Header with total score
    lines.push(`Selframe Score: ${day.influenceScore || 0}%`)
    lines.push('') // Empty line
    
    // Direct events section
    if (breakdown.directEvents && breakdown.directEvents.length > 0) {
      lines.push('📅 Direct Events:')
      breakdown.directEvents.forEach(event => {
        lines.push(`  • ${event.name} (${event.impact}/10) = +${event.score}%`)
      })
      lines.push(`  Subtotal: ${breakdown.direct.toFixed(1)}%`)
      lines.push('')
    }
    
    // Reach effects section
    if (breakdown.reachContributions && breakdown.reachContributions.length > 0) {
      lines.push('🌊 Reach Effects:')
      breakdown.reachContributions.slice(0, 3).forEach(contrib => { // Show top 3
        const daysText = contrib.daysDiff === 1 ? '1 day ago' : `${contrib.daysDiff} days ago`
        lines.push(`  • ${contrib.name} (${daysText}) = +${contrib.effect}%`)
      })
      if (breakdown.reachContributions.length > 3) {
        lines.push(`  • ...and ${breakdown.reachContributions.length - 3} more`)
      }
      lines.push(`  Subtotal: ${breakdown.reach.toFixed(1)}%`)
    }
    
    // If no events at all
    if (breakdown.directEvents.length === 0 && breakdown.reachContributions.length === 0) {
      lines.push('No activity influence')
      lines.push('Consider adding activities to boost mental health')
    }
    
    return lines.join('\n')
  }

  // Get calendar data for current month
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // Get first day of month and how many days
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay() // 0 = Sunday
    
    // Get days from previous month to fill the grid
    const prevMonth = new Date(year, month - 1, 0)
    const daysInPrevMonth = prevMonth.getDate()
    
    const calendarDays = []
    
    // Add days from previous month (grayed out)
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      calendarDays.push({
        date: daysInPrevMonth - i,
        isCurrentMonth: false,
        fullDate: new Date(year, month - 1, daysInPrevMonth - i),
        events: []
      })
    }
    
    // Add days from current month
    for (let day = 1; day <= daysInMonth; day++) {
      const fullDate = new Date(year, month, day)
      const dateString = fullDate.toISOString().split('T')[0]
      
      // Find events for this date
      const dayEvents = events.filter(event => event.date === dateString)
      
      // Calculate detailed influence breakdown for this day
      const influenceBreakdown = calculateDayInfluence(fullDate, events)
      const rawInfluenceScore = influenceBreakdown.total
      
      calendarDays.push({
        date: day,
        isCurrentMonth: true,
        fullDate,
        dateString,
        events: dayEvents,
        isToday: dateString === new Date().toISOString().split('T')[0],
        rawInfluenceScore,
        influenceBreakdown
      })
    }
    
    // Add days from next month to complete the grid (6 weeks = 42 days)
    const remainingDays = 42 - calendarDays.length
    for (let day = 1; day <= remainingDays; day++) {
      calendarDays.push({
        date: day,
        isCurrentMonth: false,
        fullDate: new Date(year, month + 1, day),
        events: []
      })
    }
    
    // Normalize all scores to 0-100 scale
    const allRawScores = calendarDays
      .filter(day => day.isCurrentMonth && day.rawInfluenceScore > 0)
      .map(day => day.rawInfluenceScore)

    calendarDays.forEach(day => {
      if (day.isCurrentMonth) {
        day.influenceScore = normalizeInfluenceScore(day.rawInfluenceScore || 0, allRawScores)
      }
    })
    
    return calendarDays
  }, [currentDate, events])

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
    setSelectedDate(null)
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
    setSelectedDate(null)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(null)
  }

  // Format month/year for header
  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  // Handle date click
  const handleDateClick = (day) => {
    if (day.isCurrentMonth) {
      setSelectedDate(day.dateString === selectedDate ? null : day.dateString)
    }
  }

  // Handle double click to open detailed modal
  const handleDoubleClick = (day) => {
    if (day.isCurrentMonth) {
      setModalDay(day)
    }
  }

  // Handle mouse events for custom tooltip
  const handleMouseEnter = (event, day) => {
    if (heatmapMode && day.isCurrentMonth) {
      const rect = event.currentTarget.getBoundingClientRect()
      setTooltip({
        show: true,
        content: getDetailedTooltip(day),
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      })
    }
  }

  const handleMouseLeave = () => {
    setTooltip({ show: false, content: '', x: 0, y: 0 })
  }

  // Handle keyboard events for modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && modalDay) {
        setModalDay(null)
      }
    }

    if (modalDay) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [modalDay])

  // Get events for selected date
  const selectedDateEvents = selectedDate 
    ? events.filter(event => event.date === selectedDate)
    : []

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Mental Health Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button 
              variant={heatmapMode ? "default" : "outline"} 
              size="sm" 
              onClick={() => setHeatmapMode(!heatmapMode)}
              className="flex items-center gap-1"
            >
              🌡️ Heatmap
            </Button>
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium text-lg min-w-[180px] text-center">
              {formatMonthYear(currentDate)}
            </span>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {/* Week day headers */}
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 border-b">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {calendarData.map((day, index) => {
            const heatmapBg = heatmapMode && day.isCurrentMonth ? getHeatmapColor(day.influenceScore || 0) : ''
            const heatmapText = heatmapMode && day.isCurrentMonth ? getHeatmapTextColor(day.influenceScore || 0) : ''
            
            return (
              <div
                key={index}
                className={`
                  min-h-[100px] p-1 border cursor-pointer transition-all duration-200
                  ${heatmapMode && day.isCurrentMonth ? 
                    `${heatmapBg} hover:opacity-80` : 
                    `border-gray-100 hover:bg-gray-50 ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}`
                  }
                  ${day.isToday && !heatmapMode ? 'bg-blue-50 border-blue-200' : ''}
                  ${selectedDate === day.dateString ? 'ring-2 ring-blue-500' : ''}
                `}
                onClick={() => handleDateClick(day)}
                onDoubleClick={() => handleDoubleClick(day)}
                onMouseEnter={(e) => handleMouseEnter(e, day)}
                onMouseLeave={handleMouseLeave}
              >
                {/* Date number */}
                <div className={`
                  text-sm font-medium mb-1
                  ${heatmapMode && day.isCurrentMonth ? 
                    heatmapText : 
                    `${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'} ${day.isToday ? 'text-blue-600 font-bold' : ''}`
                  }
                `}>
                  {day.date}
                </div>
                
                {/* Events and heatmap score */}
                <div className="space-y-1">
                  {/* Heatmap score at the top */}
                  {heatmapMode && day.isCurrentMonth && (
                    <div className="text-center">
                      <div className={`text-xs font-bold ${heatmapText}`}>
                        {day.influenceScore || 0}%
                      </div>
                    </div>
                  )}
                  
                  {/* Event indicators */}
                  {day.events.slice(0, heatmapMode ? 2 : 3).map((event, eventIndex) => (
                    <div
                      key={event.id}
                      className={`
                        text-xs px-1 py-0.5 rounded text-left truncate border
                        ${getCategoryColor(event.category)}
                        ${heatmapMode ? 'opacity-90' : ''}
                      `}
                      title={`${event.name} (Impact: ${event.impact}/10, Reach: ${event.reachValue} ${event.reachUnit})`}
                    >
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${getCategoryDotColor(event.category)}`}></div>
                        <span className="truncate">{event.name}</span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Show "+X more" if there are more events */}
                  {day.events.length > (heatmapMode ? 2 : 3) && (
                    <div className={`text-xs px-1 ${heatmapMode ? heatmapText + ' opacity-75' : 'text-gray-500'}`}>
                      +{day.events.length - (heatmapMode ? 2 : 3)} more
                    </div>
                  )}
                  
                  {/* Show "No events" message in heatmap mode when there are no events */}
                  {heatmapMode && day.events.length === 0 && day.isCurrentMonth && (
                    <div className={`text-xs text-center ${heatmapText} opacity-60`}>
                      No events
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Selected Date Details */}
        {selectedDate && selectedDateEvents.length > 0 && (
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Events for {new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedDateEvents.map(event => (
                  <div key={event.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${getCategoryDotColor(event.category)}`}></div>
                        <h4 className="font-medium">{event.name}</h4>
                        <Badge variant="outline" className={getCategoryColor(event.category)}>
                          {event.category}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Duration: {event.isAllDay ? 'All Day' : event.duration}</div>
                        <div>Impact: {event.impact}/10</div>
                        <div>Reach: {event.reachValue} {event.reachUnit}</div>
                        {event.rippleScore && (
                          <div>Ripple Score: {event.rippleScore}</div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteEvent(event.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        {heatmapMode ? (
          <div className="mt-4 space-y-2">
            <div className="text-sm font-medium">Mental Health Influence Heatmap</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
                <span>0% - No Events</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                <span>1-19% - Very Low</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
                <span>20-39% - Low</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded"></div>
                <span>40-59% - Moderate</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
                <span>60-79% - Good</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                <span>80-94% - Very Good</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-200 border border-green-300 rounded"></div>
                <span>95-100% - Excellent</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Scores are normalized to 0-100% based on your activities this month. 
              Lower percentages indicate days that could benefit from additional mental health activities.
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span>Therapy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Exercise</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Quality Time</span>
            </div>
          </div>
        )}
      </CardContent>

      {/* Detailed Breakdown Modal */}
      {modalDay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Selframe Score Breakdown
                </h2>
                <p className="text-sm text-gray-600">
                  {new Date(modalDay.dateString).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <button
                onClick={() => setModalDay(null)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {modalDay.influenceBreakdown ? (
                <div className="space-y-6">
                  {/* Total Score */}
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl font-bold text-gray-900">
                      {modalDay.influenceScore || 0}%
                    </div>
                    <div className="text-sm text-gray-600">Total Selframe Score</div>
                  </div>

                  {/* Direct Events Section */}
                  {modalDay.influenceBreakdown.directEvents && modalDay.influenceBreakdown.directEvents.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        📅 Direct Events
                        <span className="text-sm font-normal text-gray-600">
                          ({modalDay.influenceBreakdown.direct.toFixed(1)}% subtotal)
                        </span>
                      </h3>
                      <div className="space-y-2">
                        {modalDay.influenceBreakdown.directEvents.map((event, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div>
                              <div className="font-medium text-gray-900">{event.name}</div>
                              <div className="text-sm text-gray-600">Impact: {event.impact}/10</div>
                              {/* Find the original event to get reach info */}
                              {(() => {
                                const originalEvent = events.find(e => 
                                  e.name === event.name && 
                                  e.date === modalDay.dateString
                                )
                                return originalEvent ? (
                                  <div className="text-xs text-gray-500">
                                    Reach: {originalEvent.reachValue} {originalEvent.reachUnit}
                                  </div>
                                ) : null
                              })()}
                            </div>
                            <div className="text-lg font-semibold text-blue-600">
                              +{event.score}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reach Effects Section */}
                  {modalDay.influenceBreakdown.reachContributions && modalDay.influenceBreakdown.reachContributions.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        🌊 Reach Effects
                        <span className="text-sm font-normal text-gray-600">
                          ({modalDay.influenceBreakdown.reach.toFixed(1)}% subtotal)
                        </span>
                      </h3>
                      <div className="space-y-2">
                        {modalDay.influenceBreakdown.reachContributions.map((contrib, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div>
                              <div className="font-medium text-gray-900">{contrib.name}</div>
                              <div className="text-sm text-gray-600">
                                {contrib.date} • {contrib.daysDiff === 1 ? '1 day ago' : `${contrib.daysDiff} days ago`}
                              </div>
                              <div className="text-xs text-gray-500">Original impact: {contrib.impact}/10</div>
                              {/* Find the original event to get reach info */}
                              {(() => {
                                const originalEvent = events.find(e => 
                                  e.name === contrib.name && 
                                  e.date === contrib.date
                                )
                                if (originalEvent) {
                                  const totalReachDays = reachToDays(originalEvent.reachValue, originalEvent.reachUnit)
                                  const remainingDays = totalReachDays - contrib.daysDiff
                                  return (
                                    <div className="text-xs text-gray-500">
                                      Reach: {originalEvent.reachValue} {originalEvent.reachUnit} 
                                      {remainingDays > 0 && (
                                        <span className="text-green-600"> • {remainingDays} days remaining</span>
                                      )}
                                    </div>
                                  )
                                }
                                return null
                              })()}
                            </div>
                            <div className="text-lg font-semibold text-green-600">
                              +{contrib.effect}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Activity Message */}
                  {(!modalDay.influenceBreakdown.directEvents || modalDay.influenceBreakdown.directEvents.length === 0) && 
                   (!modalDay.influenceBreakdown.reachContributions || modalDay.influenceBreakdown.reachContributions.length === 0) && (
                    <div className="text-center p-8 text-gray-500">
                      <div className="text-4xl mb-2">📅</div>
                      <div className="text-lg font-medium">No Activity Influence</div>
                      <div className="text-sm">Consider adding activities to boost your mental health score</div>
                    </div>
                  )}

                  {/* Calculation Explanation */}
                  <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                    <h4 className="font-medium text-gray-900 mb-2">How is this calculated?</h4>
                    <ul className="space-y-1 text-xs">
                      <li>• <strong>Direct Events:</strong> Activities on this day (Impact × 10 = base score)</li>
                      <li>• <strong>Reach Effects:</strong> Influence from past activities with exponential decay</li>
                      <li>• <strong>Total Score:</strong> Higher of direct score or reach effects (days with events get priority)</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 text-gray-500">
                  No breakdown data available for this day.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Tooltip */}
      {tooltip.show && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-sm rounded-lg shadow-lg p-3 pointer-events-none max-w-sm"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="whitespace-pre-line">
            {tooltip.content}
          </div>
          {/* Tooltip arrow */}
          <div 
            className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"
          ></div>
        </div>
      )}
    </Card>
  )
}

export default Calendar
