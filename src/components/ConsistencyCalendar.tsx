'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
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
  platform?: 'github' | 'twitter' | 'instagram' | 'youtube' | 'all'
}

/**
 * Component that displays a GitHub-style contributions calendar
 * Shows activity across platforms and allows viewing details
 */
export default function ConsistencyCalendar({ username, showSync = false, platform = 'all' }: ConsistencyCalendarProps) {
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [yearOffset, setYearOffset] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Force yearOffset to 0 for now since we're only using 2025
  useEffect(() => {
    setYearOffset(0);
  }, []);

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
      // But make sure we don't skip the initial load
      if (loading && controller && activities.length > 0) return;
      
      setLoading(true);
      setError(null);
      
      try {
        controller = new AbortController();
        
        console.log(`Fetching activities for ${username} from ${dateRange.formattedStartDate} to ${dateRange.formattedEndDate}`);
        
        const response = await fetch(
          `/api/activities?username=${username}&start=${dateRange.formattedStartDate}&end=${dateRange.formattedEndDate}&_=${Date.now()}`,
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
        console.log('Loaded activities:', data);
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
    
    // Call fetchActivities immediately
    fetchActivities();
    
    return () => {
      isMounted = false;
      if (controller) {
        controller.abort();
      }
    };
  }, [username, dateRange.formattedStartDate, dateRange.formattedEndDate, activities.length]);

  // Handle syncing activities for a specific platform with useCallback
  const syncPlatform = useCallback(async (syncPlatform: string) => {
    if (!showSync) return;
    
    // Only sync the current platform if filtering is enabled
    if (platform !== 'all' && syncPlatform !== platform) return;
    
    setSyncing(true);
    setError(null);
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      // Get user's timezone offset in minutes
      const timezoneOffsetMinutes = new Date().getTimezoneOffset();
      
      // Use different endpoints based on platform
      let endpoint = '/api/sync/apify';
      let body: any = { date: today };
      
      if (syncPlatform === 'github') {
        endpoint = '/api/sync/github';
      } else if (syncPlatform === 'youtube') {
        endpoint = '/api/sync/youtube';
      } else {
        // For twitter and instagram, still use apify endpoint
        body.platform = syncPlatform;
      }
      
      console.log(`Syncing ${syncPlatform} with timezone offset: ${timezoneOffsetMinutes} minutes`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-timezone-offset': timezoneOffsetMinutes.toString(),
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to sync ${syncPlatform} data (${response.status})`);
      }
      
      console.log(`Successfully synced ${syncPlatform} data`);
      
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
      console.error(`Error syncing ${syncPlatform}:`, err);
      setError(err.message || `Failed to sync ${syncPlatform} data`);
      setSyncing(false);
    }
  }, [username, dateRange.formattedStartDate, dateRange.formattedEndDate, showSync, platform]);

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

  // Calculate color for a cell based on activity count and platform
  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-gray-800'
    
    // Platform-specific colors
    if (platform === 'github') {
      if (count <= 2) return 'bg-green-900'
      if (count <= 5) return 'bg-green-700'
      if (count <= 10) return 'bg-green-600'
      return 'bg-green-500'
    } else if (platform === 'twitter') {
      if (count <= 2) return 'bg-blue-900'
      if (count <= 5) return 'bg-blue-700'
      if (count <= 10) return 'bg-blue-600'
      return 'bg-blue-500'
    } else if (platform === 'instagram') {
      if (count <= 2) return 'bg-pink-900'
      if (count <= 5) return 'bg-pink-700'
      if (count <= 10) return 'bg-pink-600'
      return 'bg-pink-500'
    } else if (platform === 'youtube') {
      if (count <= 2) return 'bg-red-900'
      if (count <= 5) return 'bg-red-700'
      if (count <= 10) return 'bg-red-600'
      return 'bg-red-500'
    } else {
      // Default emerald colors for all platforms
      if (count <= 2) return 'bg-emerald-900'
      if (count <= 5) return 'bg-emerald-700'
      if (count <= 10) return 'bg-emerald-600'
      return 'bg-emerald-500'
    }
  }

  // Function to convert a date to user's local timezone
  const toLocalDate = useCallback((dateString: string) => {
    const date = parseISO(dateString);
    // Already in local timezone since parseISO uses local timezone
    return date;
  }, []);

  // Filter and process activities based on platform
  const filteredActivities = useMemo(() => {
    if (platform === 'all') {
      return activities;
    }
    
    return activities.map(activity => {
      const platformCount = activity[platform] || 0;
      return {
        ...activity,
        count: platformCount // Replace total count with platform-specific count
      };
    });
  }, [activities, platform]);

  // Get platform-specific title
  const getPlatformTitle = useMemo(() => {
    if (platform === 'all') return 'All Platforms';
    if (platform === 'github') return 'GitHub';
    if (platform === 'twitter') return 'Twitter';
    if (platform === 'instagram') return 'Instagram';
    if (platform === 'youtube') return 'YouTube';
    return '';
  }, [platform]);
  
  // Get platform-specific button class
  const getPlatformButtonClass = useCallback((buttonPlatform: string) => {
    if (syncing) return 'bg-gray-700';
    
    if (buttonPlatform === 'github') 
      return 'bg-green-700 hover:bg-green-600';
    if (buttonPlatform === 'twitter') 
      return 'bg-blue-700 hover:bg-blue-600';
    if (buttonPlatform === 'instagram') 
      return 'bg-pink-700 hover:bg-pink-600';
    if (buttonPlatform === 'youtube') 
      return 'bg-red-700 hover:bg-red-600';
    
    return 'bg-indigo-700 hover:bg-indigo-600';
  }, [syncing]);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <h2 className="text-xl font-bold">
          {filteredActivities.length > 0 
            ? `${filteredActivities.reduce((sum, a) => sum + a.count, 0)} ${getPlatformTitle} contributions in ${dateRange.startDate.getFullYear()}`
            : `${getPlatformTitle} Calendar`}
        </h2>
        
        {/* Year selector - Display only 2025 for now */}
        <div className="relative w-full sm:w-auto max-w-xs">
          <div className="flex items-center justify-between space-x-2 bg-gray-800 rounded-md px-3 py-1">
            <span className="text-sm font-medium">Year:</span>
            <span className="text-sm font-bold text-blue-400">2025</span>
          </div>
          {/* We'll uncomment and use this slider when more years are added 
          <input 
            type="range" 
            min="0" 
            max="0" 
            value={yearOffset} 
            onChange={(e) => changeYear(Number(e.target.value))}
            className="w-full h-1 mt-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          */}
        </div>
      </div>
      
      {/* Sync button - Show only the relevant platform's button */}
      {showSync && (
        <div className="mb-4 flex flex-wrap gap-2">
          {(platform === 'all' || platform === 'github') && (
            <button
              onClick={() => syncPlatform('github')}
              disabled={syncing}
              className={`px-3 py-1 rounded-md ${getPlatformButtonClass('github')}`}
            >
              {syncing ? 'Syncing...' : 'Sync GitHub'}
            </button>
          )}
          {(platform === 'all' || platform === 'twitter') && (
            <button
              onClick={() => syncPlatform('twitter')}
              disabled={syncing}
              className={`px-3 py-1 rounded-md ${getPlatformButtonClass('twitter')}`}
            >
              {syncing ? 'Syncing...' : 'Sync Twitter'}
            </button>
          )}
          {(platform === 'all' || platform === 'instagram') && (
            <button
              onClick={() => syncPlatform('instagram')}
              disabled={syncing}
              className={`px-3 py-1 rounded-md ${getPlatformButtonClass('instagram')}`}
            >
              {syncing ? 'Syncing...' : 'Sync Instagram'}
            </button>
          )}
          {(platform === 'all' || platform === 'youtube') && (
            <button
              onClick={() => syncPlatform('youtube')}
              disabled={syncing}
              className={`px-3 py-1 rounded-md ${getPlatformButtonClass('youtube')}`}
            >
              {syncing ? 'Syncing...' : 'Sync YouTube'}
            </button>
          )}
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
        <>
          <div className="md:hidden text-xs text-gray-400 italic mb-2 text-center">
            Swipe left/right to view full calendar
          </div>
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="min-w-[768px] grid grid-cols-[auto_1fr] gap-2">
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
                      const activity = filteredActivities.find(a => {
                        // Convert activity date to local timezone for comparison
                        const activityDate = toLocalDate(a.date);
                        return isSameDay(activityDate, day);
                      });
                      
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
        </>
      )}
      
      {/* Legend - Use platform-specific colors */}
      <div className="mt-4 flex items-center justify-center text-sm">
        <span className="mr-2">Less</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 bg-gray-800 rounded-sm"></div>
          {platform === 'github' && (
            <>
              <div className="w-4 h-4 bg-green-900 rounded-sm"></div>
              <div className="w-4 h-4 bg-green-700 rounded-sm"></div>
              <div className="w-4 h-4 bg-green-600 rounded-sm"></div>
              <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
            </>
          )}
          {platform === 'twitter' && (
            <>
              <div className="w-4 h-4 bg-blue-900 rounded-sm"></div>
              <div className="w-4 h-4 bg-blue-700 rounded-sm"></div>
              <div className="w-4 h-4 bg-blue-600 rounded-sm"></div>
              <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
            </>
          )}
          {platform === 'instagram' && (
            <>
              <div className="w-4 h-4 bg-pink-900 rounded-sm"></div>
              <div className="w-4 h-4 bg-pink-700 rounded-sm"></div>
              <div className="w-4 h-4 bg-pink-600 rounded-sm"></div>
              <div className="w-4 h-4 bg-pink-500 rounded-sm"></div>
            </>
          )}
          {platform === 'youtube' && (
            <>
              <div className="w-4 h-4 bg-red-900 rounded-sm"></div>
              <div className="w-4 h-4 bg-red-700 rounded-sm"></div>
              <div className="w-4 h-4 bg-red-600 rounded-sm"></div>
              <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
            </>
          )}
          {platform === 'all' && (
            <>
              <div className="w-4 h-4 bg-emerald-900 rounded-sm"></div>
              <div className="w-4 h-4 bg-emerald-700 rounded-sm"></div>
              <div className="w-4 h-4 bg-emerald-600 rounded-sm"></div>
              <div className="w-4 h-4 bg-emerald-500 rounded-sm"></div>
            </>
          )}
        </div>
        <span className="ml-2">More</span>
      </div>
      
      {/* Details Modal */}
      {showDetails && selectedDate && (
        <ActivityDetails 
          username={username}
          date={selectedDate} 
          onClose={handleCloseDetails} 
          platformFilter={platform === 'all' ? undefined : platform}
        />
      )}
    </div>
  )
} 