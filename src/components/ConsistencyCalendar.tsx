'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  parseISO,
  isAfter,
  startOfYear,
  endOfYear
} from 'date-fns'
import ActivityDetails from '@/components/ActivityDetails'
import CalendarGrid from '@/components/CalendarGrid'
import CalendarLegend from '@/components/CalendarLegend'
import SyncControls from '@/components/SyncControls'
import CalendarHeader from '@/components/CalendarHeader'
import PrivacyControls from '@/components/PrivacyControls'

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
  showPrivacyControls?: boolean
  platform?: 'github' | 'twitter' | 'instagram' | 'youtube' | 'all'
  isPublicView?: boolean
}

// Add new interfaces for request bodies and errors
interface SyncRequestBody {
  date: string;
  platform?: string;
  [key: string]: any;
}

/**
 * Component that displays a GitHub-style contributions calendar
 * Shows activity across platforms and allows viewing details
 */
export default function ConsistencyCalendar({ 
  username, 
  showSync = false, 
  showPrivacyControls = false,
  platform = 'all',
  isPublicView = false
}: ConsistencyCalendarProps) {
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
  }, [yearOffset]);

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

  // Fetch activities data with a more reliable pattern
  useEffect(() => {
    // Don't fetch if username is missing
    if (!username) return;
    
    let isMounted = true;
    const controller = new AbortController();
    
    // Reset error state
    setError(null);
    
    // Create a promise-based fetch function that won't be interrupted
    const fetchData = async () => {
      // Set loading state at the very beginning
      setLoading(true);
      
      try {
        console.log(`Fetching activities for ${username} from ${dateRange.formattedStartDate} to ${dateRange.formattedEndDate}`);
        
        // Build URL with all parameters
        const url = new URL(`/api/activities`, window.location.origin);
        url.searchParams.append('username', username);
        url.searchParams.append('start', dateRange.formattedStartDate);
        url.searchParams.append('end', dateRange.formattedEndDate);
        url.searchParams.append('cache', refreshKey.toString()); // Use refreshKey as cache buster
        
        // Add public view flag to respect privacy settings
        if (isPublicView) {
          url.searchParams.append('isPublicView', 'true');
        }
        
        // Use a fetch with timeout to prevent hanging requests
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 15000); // 15 second timeout
        });
        
        // Start the fetch with the abort controller
        const fetchPromise = fetch(url.toString(), {
          signal: controller.signal,
          // Ensure we're not using cached responses
          cache: 'no-store',
          headers: {
            'pragma': 'no-cache',
            'cache-control': 'no-cache'
          }
        });
        
        // Race between fetch and timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
        
        if (!isMounted) return;
        
        if (response.status === 401) {
          console.log('User not authenticated for activities. This is expected for public profiles.');
          setActivities([]);
          return;
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch activity data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Loaded activities:', data);
        
        if (isMounted) {
          // Only update state if component is still mounted
          setActivities(data.activities || []);
        }
      } catch (err: unknown) {
        // Only set error if component is still mounted
        if (!isMounted) return;
        
        // Don't set error state if the request was aborted
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('Activities fetch aborted');
          return;
        }
        
        console.error('Error fetching activities:', err);
        setError('Failed to load activity data');
      } finally {
        // Always clear loading state if component is still mounted
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    // Execute fetch immediately
    fetchData();
    
    // Cleanup function
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [username, dateRange.formattedStartDate, dateRange.formattedEndDate, refreshKey, isPublicView, platform]);

  // Update refreshActivities to be more reliable
  const refreshActivities = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Force refresh by incrementing the refresh key
      // This will trigger the useEffect above
      setRefreshKey(prev => prev + 1);
      
      // No need to duplicate the fetch logic here - the useEffect will handle it
    } catch (err: unknown) {
      console.error('Error refreshing activities:', err);
      setError('Failed to refresh activity data');
      setLoading(false);
    }
  }, [setRefreshKey, setLoading, setError]);

  // Handle syncing activities for a specific platform with useCallback
  const syncPlatform = useCallback(async (syncPlatform: string) => {
    if (!showSync) return;
    
    // Only sync the current platform if filtering is enabled
    if (platform !== 'all' && syncPlatform !== platform && syncPlatform !== 'all') return;
    
    setSyncing(true);
    setError(null);
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      // Get user's timezone offset in minutes
      const timezoneOffsetMinutes = new Date().getTimezoneOffset();
      
      // If 'all' is selected, sync all platforms
      if (syncPlatform === 'all') {
        console.log('Syncing all platforms sequentially');
        
        // Clear activities first to force a refresh
        setActivities([]);
        
        // Define all platforms to sync
        const platformsToSync = ['github', 'twitter', 'instagram', 'youtube'];
        
        for (const platformToSync of platformsToSync) {
          try {
            // Use different endpoints based on platform
            const endpoint = platformToSync === 'github' 
              ? '/api/sync/github' 
              : platformToSync === 'youtube'
                ? '/api/sync/youtube'
                : '/api/sync/apify';
            
            const body: SyncRequestBody = { date: today };
            
            if (endpoint === '/api/sync/apify') {
              // For twitter and instagram, use apify endpoint
              body.platform = platformToSync;
            }
            
            console.log(`Syncing ${platformToSync} with timezone offset: ${timezoneOffsetMinutes} minutes`);
            
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
              console.error(`Error syncing ${platformToSync}: ${errorData.error || response.status}`);
              // Continue with other platforms even if one fails
              continue;
            }
            
            console.log(`Successfully synced ${platformToSync} data`);
          } catch (err) {
            console.error(`Error syncing ${platformToSync}:`, err);
            // Continue with other platforms even if one fails
            continue;
          }
        }
        
        // Force refresh by incrementing the refresh key after all syncs
        setRefreshKey(prev => prev + 1);
        
        // Wait a moment to ensure DB updates are complete
        setTimeout(async () => {
          // Refresh activities data
          await refreshActivities(); // Ensure refreshActivities is declared before use
          setSyncing(false);
        }, 1500); // Slightly longer delay when syncing all platforms
        
        return;
      }
      
      // Handle single platform sync (original code)
      // Use different endpoints based on platform
      const endpoint = syncPlatform === 'github' 
        ? '/api/sync/github' 
        : syncPlatform === 'youtube'
          ? '/api/sync/youtube'
          : '/api/sync/apify';
      
      const body: SyncRequestBody = { date: today };
      
      if (endpoint === '/api/sync/apify') {
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
        await refreshActivities(); // Ensure refreshActivities is declared before use
        setSyncing(false);
      }, 1000); // Increase delay to ensure data is ready
      
    } catch (err: unknown) {
      console.error(`Error syncing ${syncPlatform}:`, err);
      
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('not configured')) {
        setError(`${syncPlatform} username is not configured in your profile`);
      } else {
        setError(`Failed to sync ${syncPlatform} data: ${errorMessage}`);
      }
      setSyncing(false);
    }
  }, [username, dateRange.formattedStartDate, dateRange.formattedEndDate, showSync, platform, isPublicView, refreshActivities]);

  // Calculate color for a cell based on activity count and platform
  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-gray-200 border border-gray-300'
    
    // Platform-specific colors with improved contrast for white background
    if (platform === 'github') {
      if (count <= 2) return 'bg-green-300 border border-green-400 shadow-sm shadow-green-400/50'
      if (count <= 5) return 'bg-green-500 border border-green-600 shadow-sm shadow-green-500/50' 
      if (count <= 10) return 'bg-green-600 border border-green-700 shadow-sm shadow-green-600/50'
      return 'bg-green-700 border border-green-800 shadow-sm shadow-green-700/50'
    } else if (platform === 'twitter') {
      if (count <= 2) return 'bg-blue-300 border border-blue-400 shadow-sm shadow-blue-400/50'
      if (count <= 5) return 'bg-blue-500 border border-blue-600 shadow-sm shadow-blue-500/50'
      if (count <= 10) return 'bg-blue-600 border border-blue-700 shadow-sm shadow-blue-600/50'
      return 'bg-blue-700 border border-blue-800 shadow-sm shadow-blue-700/50'
    } else if (platform === 'instagram') {
      if (count <= 2) return 'bg-pink-300 border border-pink-400 shadow-sm shadow-pink-400/50'
      if (count <= 5) return 'bg-pink-500 border border-pink-600 shadow-sm shadow-pink-500/50'
      if (count <= 10) return 'bg-pink-600 border border-pink-700 shadow-sm shadow-pink-600/50'
      return 'bg-pink-700 border border-pink-800 shadow-sm shadow-pink-700/50'
    } else if (platform === 'youtube') {
      if (count <= 2) return 'bg-red-300 border border-red-400 shadow-sm shadow-red-400/50'
      if (count <= 5) return 'bg-red-500 border border-red-600 shadow-sm shadow-red-500/50'
      if (count <= 10) return 'bg-red-600 border border-red-700 shadow-sm shadow-red-600/50'
      return 'bg-red-700 border border-red-800 shadow-sm shadow-red-700/50'
    } else {
      // Default purple colors for all platforms
      if (count <= 2) return 'bg-purple-300 border border-purple-400 shadow-sm shadow-purple-400/50'
      if (count <= 5) return 'bg-purple-500 border border-purple-600 shadow-sm shadow-purple-500/50'
      if (count <= 10) return 'bg-purple-600 border border-purple-700 shadow-sm shadow-purple-600/50'
      return 'bg-purple-700 border border-purple-800 shadow-sm shadow-purple-700/50'
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
    if (syncing) return 'bg-gray-300 text-gray-700';
    
    if (buttonPlatform === 'github') 
      return 'bg-green-600 hover:bg-green-700 text-white shadow-sm';
    if (buttonPlatform === 'twitter') 
      return 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm';
    if (buttonPlatform === 'instagram') 
      return 'bg-pink-600 hover:bg-pink-700 text-white shadow-sm';
    if (buttonPlatform === 'youtube') 
      return 'bg-red-600 hover:bg-red-700 text-white shadow-sm';
    
    return 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm';
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
    <div className="bg-gray-100 text-gray-800 p-6 rounded-xl shadow-md border border-gray-200">
      {/* Calendar Header */}
      <CalendarHeader
        filteredActivities={filteredActivities}
        getPlatformTitle={getPlatformTitle}
        dateRange={dateRange}
        yearOffset={yearOffset}
        changeYear={changeYear}
      />
      
      {/* Privacy Controls - Only show when not in public view */}
      {showPrivacyControls && !isPublicView && (
        <PrivacyControls
          username={username}
          platform={platform}
        />
      )}
      
      {/* Sync Controls - Only show when not in public view */}
      {showSync && !isPublicView && (
        <SyncControls
          platform={platform}
          syncing={syncing}
          syncPlatform={syncPlatform}
          getPlatformButtonClass={getPlatformButtonClass}
        />
      )}
      
      {error && (
        <div className="bg-red-900 text-white p-2 mb-4 rounded">
          {error}
        </div>
      )}
      
      {/* Calendar Grid */}
      <CalendarGrid
        months={months}
        weeks={weeks}
        dateRange={dateRange}
        filteredActivities={filteredActivities}
        getCellColor={getCellColor}
        toLocalDate={toLocalDate}
        handleDayClick={handleDayClick}
        loading={loading}
      />
      
      {/* Calendar Legend */}
      <CalendarLegend platform={platform} />
      
      {/* Details Modal - Disable when in public view if needed */}
      {showDetails && selectedDate && (
        <ActivityDetails 
          username={username}
          date={selectedDate} 
          onClose={handleCloseDetails} 
          platformFilter={platform === 'all' ? undefined : platform}
          isPublicView={isPublicView}
        />
      )}
    </div>
  )
} 