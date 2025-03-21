import { NextRequest, NextResponse } from 'next/server'
import { createDbClient, executeWithRetry } from '@/lib/db'
import { users, activities } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getLoggedInUser } from '@/lib/auth'
import { format, parseISO } from 'date-fns'

/**
 * Format a date to YYYY-MM-DD
 * @param date Date to format
 * @returns Formatted date string
 */
function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * API route to sync YouTube data using the YouTube API
 * @param request The incoming request
 * @returns JSON response with synced data
 */
export async function POST(request: NextRequest) {
  try {
    // Get request data
    const requestData = await request.json().catch(() => ({}))
    const { date, userId } = requestData
    
    let user;
    
    // If userId is provided, this is a request from the cron job
    // Otherwise, get the currently logged in user
    if (userId) {
      // Check if this is a cron job request with the proper authorization
      const authHeader = request.headers.get('Authorization')
      const cronSecret = process.env.CRON_SECRET
      
      if (!cronSecret) {
        console.error('CRON_SECRET environment variable is not set')
        return NextResponse.json(
          { error: 'Server configuration error: CRON_SECRET is not configured.' }, 
          { status: 500 }
        )
      }
      
      if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== cronSecret) {
        console.error('Unauthorized attempt to access YouTube API with userId')
        return NextResponse.json(
          { error: 'Unauthorized. Cron secret required for userId parameter.' }, 
          { status: 401 }
        )
      }
      
      // Use the provided userId
      user = { id: userId }
    } else {
      // Get the currently logged in user
      user = await getLoggedInUser()
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required. Please log in.' }, 
          { status: 401 }
        )
      }
    }
    
    // Parse date or use current date if not provided
    const targetDate = date ? parseISO(date) : new Date()
    const formattedDate = formatDate(targetDate)
    
    // Get user profile data with social media usernames
    const db = createDbClient()
    const userData = await executeWithRetry(async () => {
      const userResults = await db.select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)
      
      if (userResults.length > 0) {
        return userResults[0]
      }
      return null
    })
    
    if (!userData) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    try {
      // Fetch YouTube data directly using the YouTube API
      // Get YouTube username from user data, removing @ if present
      const youtubeUsernameOrHandle = userData.youtube_username || "";
      
      if (!youtubeUsernameOrHandle) {
        // For cron job requests, return a clean response that can be handled gracefully
        if (userId) {
          return NextResponse.json({
            message: 'Skipped YouTube sync - no username configured',
            date: formattedDate,
            data: {
              video_count: 0,
              video_urls: [],
              videos: []
            }
          });
        }
        
        // For regular user requests, show an error
        return NextResponse.json(
          { error: 'YouTube username not found in your profile. Please add your YouTube username first.' },
          { status: 400 }
        );
      }
      
      const platformData = await fetchYouTubeData(youtubeUsernameOrHandle, targetDate)
      
      // Update or insert activity data in the database
      await executeWithRetry(async () => {
        // Check if activity record exists for this date
        const existingActivity = await db.select()
          .from(activities)
          .where(
            and(
              eq(activities.username, userData.username || ''),
              eq(activities.activity_date, formattedDate)
            )
          )
          .limit(1)
        
        // Calculate the count to add to total_activity_count
        const countToAdd = getPlatformItemCount(platformData)
        
        // Calculate the count to subtract from existing record (if any)
        let countToSubtract = 0;
        if (existingActivity.length > 0 && existingActivity[0].youtube_data) {
          countToSubtract = getPlatformItemCount(existingActivity[0].youtube_data);
        }
        
        if (existingActivity.length > 0) {
          // Update existing record with new platform data
          await db.update(activities)
            .set({
              youtube_data: platformData,
              last_synced: new Date(),
              total_activity_count: (existingActivity[0].total_activity_count || 0) - countToSubtract + countToAdd
            })
            .where(
              and(
                eq(activities.username, userData.username || ''),
                eq(activities.activity_date, formattedDate)
              )
            )
        } else {
          // Insert new record
          await db.insert(activities).values({
            username: userData.username || '',
            activity_date: formattedDate,
            youtube_data: platformData,
            last_synced: new Date(),
            total_activity_count: countToAdd
          })
        }
      })
      
      return NextResponse.json({
        message: `YouTube data synced successfully`,
        date: formattedDate,
        data: platformData
      })
    } catch (error) {
      console.error('Error syncing YouTube data:', error)
      return NextResponse.json(
        { error: 'Failed to sync YouTube data' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error syncing YouTube data:', error)
    return NextResponse.json(
      { error: 'Failed to sync YouTube data' },
      { status: 500 }
    )
  }
}

/**
 * Fetch YouTube data directly using the YouTube Data API
 * @param usernameOrHandle The YouTube username/handle to fetch data for
 * @param date The target date
 * @returns Formatted YouTube data
 */
async function fetchYouTubeData(usernameOrHandle: string, date: Date) {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    throw new Error('YouTube API key not configured')
  }
  
  const formattedDate = formatDate(date)
  console.log(`Fetching YouTube data for username/handle: ${usernameOrHandle}, date: ${formattedDate}`)
  
  // Step 1: Get the channel ID from the username/handle
  let channelId
  
  if (usernameOrHandle.startsWith('UC')) {
    // It's already a channel ID
    channelId = usernameOrHandle
    console.log(`Using provided channel ID: ${channelId}`)
  } else {
    // Try to get channel ID from handle
    const handle = usernameOrHandle.startsWith('@') ? usernameOrHandle : `@${usernameOrHandle}`
    console.log(`Looking up channel ID for handle: ${handle}`)
    
    try {
      const handleLookupUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handle}&key=${apiKey}`
      const response = await fetch(handleLookupUrl)
      console.log(`YouTube API response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        console.error(`YouTube API error looking up channel by handle (${response.status}): ${errorText}`)
        throw new Error(`YouTube API error looking up channel by handle: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.items || data.items.length === 0) {
        // Try alternative lookup by username if handle lookup fails
        console.log(`No channel found for handle ${handle}, trying forUsername lookup`)
        const username = usernameOrHandle.replace('@', '')
        const usernameLookupUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${username}&key=${apiKey}`
        
        try {
          const usernameResponse = await fetch(usernameLookupUrl)
          
          if (!usernameResponse.ok) {
            const errorText = await usernameResponse.text().catch(() => usernameResponse.statusText)
            console.error(`YouTube API error looking up channel by username (${usernameResponse.status}): ${errorText}`)
            throw new Error(`YouTube API error looking up channel by username: ${usernameResponse.statusText}`)
          }
          
          const usernameData = await usernameResponse.json()
          
          if (!usernameData.items || usernameData.items.length === 0) {
            // As a last resort, try a search
            console.log(`No channel found for username ${username}, trying search`)
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(username)}&type=channel&maxResults=1&key=${apiKey}`
            
            const searchResponse = await fetch(searchUrl)
            
            if (!searchResponse.ok) {
              throw new Error(`YouTube API error searching for channel: ${searchResponse.statusText}`)
            }
            
            const searchData = await searchResponse.json()
            
            if (!searchData.items || searchData.items.length === 0) {
              throw new Error(`No YouTube channel found for ${usernameOrHandle}`)
            }
            
            channelId = searchData.items[0].id.channelId
            console.log(`Found channel ID ${channelId} through search`)
          } else {
            channelId = usernameData.items[0].id
          }
        } catch (error) {
          console.error('Error looking up YouTube channel by username:', error)
          throw error
        }
      } else {
        channelId = data.items[0].id
      }
    } catch (error) {
      console.error('Error looking up YouTube channel:', error)
      throw new Error(`Failed to get YouTube channel ID for ${usernameOrHandle}: ${error}`)
    }
  }
  
  console.log(`Found YouTube channel ID: ${channelId}`)
  
  // Step 2: Get the videos from the channel
  console.log(`Fetching videos for YouTube channel ID: ${channelId}`)
  
  // Step 2: Calculate the time range for the published date
  const targetDate = new Date(formattedDate)
  const nextDay = new Date(targetDate)
  nextDay.setDate(nextDay.getDate() + 1)
   
  // Format dates for YouTube API (RFC 3339 format)
  const publishedAfter = targetDate.toISOString()
  const publishedBefore = nextDay.toISOString()
  
  // Step 3: Fetch videos published by the channel within the date range
  const videoUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&publishedAfter=${publishedAfter}&publishedBefore=${publishedBefore}&type=video&maxResults=50&order=date&key=${apiKey}`
  
  try {
    const videoResponse = await fetch(videoUrl)
    
    if (!videoResponse.ok) {
      const errorText = await videoResponse.text().catch(() => videoResponse.statusText)
      console.error(`YouTube API error fetching videos (${videoResponse.status}): ${errorText}`)
      throw new Error(`YouTube API error fetching videos: ${videoResponse.statusText}`)
    }
    
    const videoData = await videoResponse.json()
    
    // Map video items to our expected format
    const videos = videoData.items?.map((item: any) => {
      const videoId = item.id.videoId
      const url = `https://www.youtube.com/watch?v=${videoId}`
      const publishedDate = new Date(item.snippet.publishedAt)
      
      return {
        url,
        title: item.snippet.title,
        published_at: publishedDate.toISOString(),
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      }
    }) || []
    
    // Extract just the URLs
    const videoUrls = videos.map((video: any) => video.url)
    
    return {
      video_count: videos.length,
      video_urls: videoUrls,
      videos,
    }
  } catch (error) {
    console.error('Error fetching YouTube videos:', error)
    throw error
  }
}

/**
 * Get the item count from platform data
 * @param data Platform data
 * @returns Item count
 */
function getPlatformItemCount(data: any): number {
  if (!data) return 0
  
  return data.video_count || 0
}

// Explanation of the code:
// This code defines an API route for syncing YouTube data. It starts by importing necessary modules and defining helper functions. 
// The `POST` function handles incoming requests, checks user authentication, and retrieves request data. 
// It fetches YouTube data for a specified channel and date, updates or inserts activity records in the database, 
// and returns a success message with the synced data. The `fetchYouTubeData` function interacts with the YouTube API 
// to retrieve video information, while `getPlatformItemCount` calculates the number of items from the fetched data.