'use client'

import React, { useState, useEffect } from 'react'
import {
  subDays,
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  parseISO,
  isSameDay,
  isAfter
} from 'date-fns'
import ActivityDetails from '@/components/ActivityDetails'

interface ActivityData {
  date: string
  count: number
  github: number
  twitter: number
  youtube: number
  instagram: number
}

interface ConsistencyCalendarProps {
  username: string
  showSync?: boolean
}

/**
 * Component that displays a GitHub-style contributions calendar
 * Shows activity across platforms and allows viewing details
 */
export default function ConsistencyCalendar({ username, showSync = false }: ConsistencyCalendarProps) {
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [yearOffset, setYearOffset] = useState(0)
  const [syncing, setSyncing] = useState(false)

  // Calculate date range
  const today = new Date()
  const endDate = yearOffset === 0 
    ? today 
    : new Date(today.getFullYear() - yearOffset, 11, 31)
  const startDate = new Date(endDate.getFullYear(), 0, 1)

  // Fetch activities data
  useEffect(() => {
    let isMounted = true;
    
    async function fetchActivities() {
      if (!username) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const formattedStartDate = format(startDate, 'yyyy-MM-dd');
        const formattedEndDate = format(endDate, 'yyyy-MM-dd');
        
        const response = await fetch(
          `/api/activities?username=${username}&start=${formattedStartDate}&end=${formattedEndDate}`
        );
        
        if (!isMounted) return;
        
        if (response.status === 401) {
          console.log('User not authenticated for activities. This is expected for public profiles.');
          setActivities([]);
          setLoading(false);
          return;
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch activity data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setActivities(data.activities || []);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError('Failed to load activity data');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    
    fetchActivities();
    
    return () => {
      isMounted = false;
    };
  }, [username, startDate, endDate, yearOffset]);

  // Handle syncing activities for a specific platform
  const syncPlatform = async (platform: string) => {
    if (!showSync) return
    
    setSyncing(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      
      const response = await fetch(`/api/sync/${platform === 'github' ? 'github' : 'apify'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: today,
          ...(platform !== 'github' && { platform }),
        }),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to sync ${platform} data`)
      }
      
      // Refresh activities data
      const activitiesResponse = await fetch(
        `/api/activities?username=${username}&start=${format(startDate, 'yyyy-MM-dd')}&end=${format(endDate, 'yyyy-MM-dd')}`
      )
      
      if (!activitiesResponse.ok) {
        throw new Error('Failed to refresh activity data')
      }
      
      const data = await activitiesResponse.json()
      setActivities(data.activities || [])
      
    } catch (err) {
      console.error(`Error syncing ${platform}:`, err)
      setError(`Failed to sync ${platform} data`)
    } finally {
      setSyncing(false)
    }
  }

  // Calculate color for a cell based on activity count
  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-gray-800'
    if (count <= 2) return 'bg-emerald-900'
    if (count <= 5) return 'bg-emerald-700'
    if (count <= 10) return 'bg-emerald-600'
    return 'bg-emerald-500'
  }

  // Generate calendar grid
  const generateCalendar = () => {
    const months = []
    
    // Generate months for the year
    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(startDate.getFullYear(), month, 1)
      months.push({
        name: format(monthDate, 'MMM'),
        date: monthDate
      })
    }
    
    // Generate weeks (Sunday to Saturday)
    const weeks = []
    let currentDate = startOfWeek(startDate, { weekStartsOn: 0 })
    const calendarEndDate = endOfWeek(endDate, { weekStartsOn: 0 })
    
    while (currentDate <= calendarEndDate) {
      const week = eachDayOfInterval({
        start: currentDate,
        end: addDays(currentDate, 6)
      })
      
      weeks.push(week)
      currentDate = addDays(currentDate, 7)
    }
    
    return { months, weeks }
  }
  
  const { months, weeks } = generateCalendar()

  // Handle clicking on a day cell
  const handleDayClick = (date: Date) => {
    // Don't allow selecting future dates
    if (isAfter(date, new Date())) {
      return
    }
    
    const formattedDate = format(date, 'yyyy-MM-dd')
    setSelectedDate(formattedDate)
    setShowDetails(true)
  }

  // Close details modal
  const handleCloseDetails = () => {
    setShowDetails(false)
  }

  // Change year offset
  const changeYear = (offset: number) => {
    setYearOffset(offset)
  }
  
  return (
    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">
          {activities.length > 0 
            ? `${activities.reduce((sum, a) => sum + a.count, 0)} contributions in ${startDate.getFullYear()}`
            : 'Consistency Calendar'}
        </h2>
        
        {/* Year selector */}
        <div className="flex space-x-2">
          {[0, 1, 2, 3, 4].map((year) => (
            <button
              key={year}
              className={`px-4 py-1 rounded ${yearOffset === year ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              onClick={() => changeYear(year)}
            >
              {new Date().getFullYear() - year}
            </button>
          ))}
        </div>
      </div>
      
      {/* Sync buttons */}
      {showSync && (
        <div className="mb-4 flex space-x-2">
          <button
            onClick={() => syncPlatform('github')}
            disabled={syncing}
            className={`px-3 py-1 rounded-md ${syncing ? 'bg-gray-700' : 'bg-indigo-700 hover:bg-indigo-600'}`}
          >
            {syncing ? 'Syncing...' : 'Sync GitHub'}
          </button>
          <button
            onClick={() => syncPlatform('twitter')}
            disabled={syncing}
            className={`px-3 py-1 rounded-md ${syncing ? 'bg-gray-700' : 'bg-blue-700 hover:bg-blue-600'}`}
          >
            {syncing ? 'Syncing...' : 'Sync Twitter'}
          </button>
          <button
            onClick={() => syncPlatform('instagram')}
            disabled={syncing}
            className={`px-3 py-1 rounded-md ${syncing ? 'bg-gray-700' : 'bg-pink-700 hover:bg-pink-600'}`}
          >
            {syncing ? 'Syncing...' : 'Sync Instagram'}
          </button>
          <button
            onClick={() => syncPlatform('youtube')}
            disabled={syncing}
            className={`px-3 py-1 rounded-md ${syncing ? 'bg-gray-700' : 'bg-red-700 hover:bg-red-600'}`}
          >
            {syncing ? 'Syncing...' : 'Sync YouTube'}
          </button>
        </div>
      )}
      
      {error && (
        <div className="bg-red-900 text-white p-2 mb-4 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Month labels */}
            <div className="flex mb-1 text-xs text-gray-400">
              <div className="w-10"></div>
              <div className="flex">
                {months.map((month, i) => (
                  <div key={i} className="w-7 mx-0.5 text-center">
                    {month.name}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Days of week and calendar grid */}
            <div className="flex">
              {/* Day labels */}
              <div className="flex flex-col mr-2 text-xs text-gray-400">
                <div className="h-7 flex items-center">Mon</div>
                <div className="h-7 flex items-center">Wed</div>
                <div className="h-7 flex items-center">Fri</div>
              </div>
              
              {/* Calendar grid */}
              <div>
                <div className="grid grid-cols-53 gap-1">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-1">
                      {week.map((day, dayIndex) => {
                        // Find activity for this day
                        const dayStr = format(day, 'yyyy-MM-dd')
                        const activity = activities.find(a => 
                          a.date === dayStr
                        )
                        
                        // Skip days outside our target year
                        if (day.getFullYear() !== startDate.getFullYear()) {
                          return <div key={dayIndex} className="w-5 h-5"></div>
                        }
                        
                        const count = activity?.count || 0
                        const isFuture = isAfter(day, new Date())
                        
                        return (
                          <div
                            key={dayIndex}
                            className={`
                              w-5 h-5 rounded-sm cursor-pointer
                              ${isFuture ? 'bg-gray-800 opacity-30 cursor-default' : getCellColor(count)}
                              transition-colors duration-200
                            `}
                            onClick={() => !isFuture && handleDayClick(day)}
                            title={`${format(day, 'MMM d, yyyy')}: ${count} contributions`}
                            data-date={dayStr}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex justify-end mt-2 text-xs text-gray-400 items-center">
              <span className="mr-2">Less</span>
              <div className="flex space-x-1">
                <div className="w-3 h-3 rounded-sm bg-gray-800"></div>
                <div className="w-3 h-3 rounded-sm bg-emerald-900"></div>
                <div className="w-3 h-3 rounded-sm bg-emerald-700"></div>
                <div className="w-3 h-3 rounded-sm bg-emerald-600"></div>
                <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
              </div>
              <span className="ml-2">More</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Activity details modal */}
      {showDetails && selectedDate && (
        <ActivityDetails
          username={username}
          date={selectedDate}
          onClose={handleCloseDetails}
          canSync={showSync}
        />
      )}
    </div>
  )
} 