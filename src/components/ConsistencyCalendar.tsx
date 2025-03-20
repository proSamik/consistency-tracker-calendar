'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  subDays,
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  parseISO,
  isSameDay,
  isAfter,
  startOfYear,
  endOfYear
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
  const [refreshKey, setRefreshKey] = useState(0)

  // Calculate date range using useMemo to prevent recalculations on every render
  const dateRange = useMemo(() => {
    const today = new Date()
    const currentYear = today.getFullYear() - yearOffset
    
    // Using startOfYear and endOfYear ensures stable date objects
    const start = startOfYear(new Date(currentYear, 0, 1))
    const end = yearOffset === 0 ? today : endOfYear(new Date(currentYear, 0, 1))
    
    return {
      startDate: start,
      endDate: end,
      formattedStartDate: format(start, 'yyyy-MM-dd'),
      formattedEndDate: format(end, 'yyyy-MM-dd'),
    }
  }, [yearOffset, refreshKey])

  // Memoize calendar generation to prevent recalculation on every render
  const { months, weeks } = useMemo(() => {
    const monthsArray = []
    
    // Generate months for the year
    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(dateRange.startDate.getFullYear(), month, 1)
      monthsArray.push({
        name: format(monthDate, 'MMM'),
        date: monthDate
      })
    }
    
    // Generate weeks (Sunday to Saturday)
    const weeksArray = []
    let currentDate = startOfWeek(dateRange.startDate, { weekStartsOn: 0 })
    const calendarEndDate = endOfWeek(dateRange.endDate, { weekStartsOn: 0 })
    
    while (currentDate <= calendarEndDate) {
      const week = eachDayOfInterval({
        start: currentDate,
        end: addDays(currentDate, 6)
      })
      
      weeksArray.push(week)
      currentDate = addDays(currentDate, 7)
    }
    
    return { months: monthsArray, weeks: weeksArray }
  }, [dateRange.startDate, dateRange.endDate])

  // Fetch activities data with stronger dependency control
  useEffect(() => {
    let isMounted = true;
    let controller: AbortController | null = new AbortController();
    
    async function fetchActivities() {
      if (!username) return;
      
      // Don't reload if already loading - prevents multiple simultaneous requests
      if (loading && controller) return;
      
      setLoading(true);
      setError(null);
      
      try {
        controller = new AbortController();
        
        const response = await fetch(
          `/api/activities?username=${username}&start=${dateRange.formattedStartDate}&end=${dateRange.formattedEndDate}`,
          { signal: controller.signal }
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
      } catch (err: any) {
        // Don't set error state if the request was aborted
        if (err.name === 'AbortError') {
          console.log('Activities fetch aborted');
          return;
        }
        
        console.error('Error fetching activities:', err);
        setError('Failed to load activity data');
      } finally {
        if (isMounted) {
          setLoading(false);
          controller = null;
        }
      }
    }
    
    fetchActivities();
    
    return () => {
      isMounted = false;
      if (controller) {
        controller.abort();
      }
    };
  }, [username, dateRange.formattedStartDate, dateRange.formattedEndDate]);

  // Handle syncing activities for a specific platform with useCallback
  const syncPlatform = useCallback(async (platform: string) => {
    if (!showSync) return;
    
    setSyncing(true);
    setError(null);
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const response = await fetch(`/api/sync/${platform === 'github' ? 'github' : 'apify'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: today,
          ...(platform !== 'github' && { platform }),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to sync ${platform} data (${response.status})`);
      }
      
      console.log(`Successfully synced ${platform} data`);
      
      // Clear activities first to force a refresh
      setActivities([]);
      
      // Force refresh by incrementing the refresh key
      setRefreshKey(prev => prev + 1);
      
      // Wait a moment to ensure DB updates are complete
      setTimeout(async () => {
        // Refresh activities data
        await refreshActivities();
        setSyncing(false);
      }, 1000); // Increase delay to ensure data is ready
      
    } catch (err: any) {
      console.error(`Error syncing ${platform}:`, err);
      setError(err.message || `Failed to sync ${platform} data`);
      setSyncing(false);
    }
  }, [username, dateRange.formattedStartDate, dateRange.formattedEndDate, showSync]);

  /**
   * Helper function to refresh activities data
   */
  const refreshActivities = useCallback(async () => {
    try {
      setLoading(true);
      
      // Force refresh by incrementing the refresh key
      setRefreshKey(prev => prev + 1);
      
      const activitiesResponse = await fetch(
        `/api/activities?username=${username}&start=${dateRange.formattedStartDate}&end=${dateRange.formattedEndDate}&nocache=${Date.now()}`
      );
      
      if (!activitiesResponse.ok) {
        throw new Error('Failed to refresh activity data');
      }
      
      const data = await activitiesResponse.json();
      console.log('Refreshed activities data:', data);
      setActivities(data.activities || []);
    } catch (err: any) {
      console.error('Error refreshing activities:', err);
      setError(err.message || 'Failed to refresh activity data');
    } finally {
      setLoading(false);
    }
  }, [username, dateRange.formattedStartDate, dateRange.formattedEndDate]);

  // Calculate color for a cell based on activity count
  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-gray-800'
    if (count <= 2) return 'bg-emerald-900'
    if (count <= 5) return 'bg-emerald-700'
    if (count <= 10) return 'bg-emerald-600'
    return 'bg-emerald-500'
  }

  // Handle clicking on a day cell
  const handleDayClick = useCallback((date: Date) => {
    // Don't allow selecting future dates
    if (isAfter(date, new Date())) {
      return
    }
    
    const formattedDate = format(date, 'yyyy-MM-dd')
    setSelectedDate(formattedDate)
    setShowDetails(true)
  }, []);

  // Close details modal
  const handleCloseDetails = useCallback(() => {
    setShowDetails(false)
  }, []);

  // Change year offset
  const changeYear = useCallback((offset: number) => {
    setYearOffset(offset);
  }, []);
  
  return (
    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">
          {activities.length > 0 
            ? `${activities.reduce((sum, a) => sum + a.count, 0)} contributions in ${dateRange.startDate.getFullYear()}`
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
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[auto_1fr] gap-2">
            {/* Month labels */}
            <div className="col-start-2 flex">
              {months.map((month, i) => (
                <div key={i} className="flex-1 text-center text-xs text-gray-400">
                  {month.name}
                </div>
              ))}
            </div>
            
            {/* Day labels and cells */}
            <div className="flex flex-col justify-around h-full py-1">
              <div className="text-xs text-gray-400">Mon</div>
              <div className="text-xs text-gray-400">Wed</div>
              <div className="text-xs text-gray-400">Fri</div>
            </div>
            
            <div className="grid grid-cols-52 gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => {
                    // Find activity for this day if any
                    const activity = activities.find(a => 
                      isSameDay(parseISO(a.date), day)
                    )
                    
                    // Skip days outside our target year
                    if (day.getFullYear() !== dateRange.startDate.getFullYear()) {
                      return <div key={dayIndex} className="w-5 h-5"></div>
                    }
                    
                    const count = activity ? activity.count : 0
                    const colorClass = getCellColor(count)
                    
                    return (
                      <div
                        key={dayIndex}
                        className={`w-5 h-5 rounded-sm ${colorClass} cursor-pointer hover:opacity-80 transition-opacity`}
                        title={`${format(day, 'MMM d, yyyy')}: ${count} contributions`}
                        onClick={() => handleDayClick(day)}
                      ></div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center text-sm">
        <span className="mr-2">Less</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 bg-gray-800 rounded-sm"></div>
          <div className="w-4 h-4 bg-emerald-900 rounded-sm"></div>
          <div className="w-4 h-4 bg-emerald-700 rounded-sm"></div>
          <div className="w-4 h-4 bg-emerald-600 rounded-sm"></div>
          <div className="w-4 h-4 bg-emerald-500 rounded-sm"></div>
        </div>
        <span className="ml-2">More</span>
      </div>
      
      {/* Details Modal */}
      {showDetails && selectedDate && (
        <ActivityDetails 
          username={username}
          date={selectedDate} 
          onClose={handleCloseDetails} 
        />
      )}
    </div>
  )
} 