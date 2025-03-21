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
    // Get the currently logged in user
    const user = await getLoggedInUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in.' }, 
        { status: 401 }
      )
    }

    // Get request data
    const requestData = await request.json()
    const { date } = requestData
    
    // Hard-coded channel ID for now as specified
    const channelId = "UCbRP3c757lWg9M-U7TyEkXA"
    
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
      const platformData = await fetchYouTubeData(channelId, targetDate)
      
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
 * @param channelId The YouTube channel ID to fetch data for
 * @param date The target date
 * @returns Formatted YouTube data
 */
async function fetchYouTubeData(channelId: string, date: Date) {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    throw new Error('YouTube API key not configured')
  }
  
  const formattedDate = formatDate(date)
  console.log(`Fetching YouTube data for channel ID: ${channelId}, date: ${formattedDate}`)
  
  // Calculate the time range for the published date
  const targetDate = new Date(formattedDate)
  const nextDay = new Date(targetDate)
  nextDay.setDate(nextDay.getDate() + 1)
  
  // Format dates for YouTube API (RFC 3339 format)
  const publishedAfter = targetDate.toISOString()
  const publishedBefore = nextDay.toISOString()
  
  // Fetch videos published by the channel within the date range
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&publishedAfter=${publishedAfter}&publishedBefore=${publishedBefore}&type=video&maxResults=50&order=date&key=${apiKey}`
  
  try {
    const response = await fetch(searchUrl)
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      console.error(`YouTube API error (${response.status}): ${errorText}`)
      throw new Error(`YouTube API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log(`Retrieved ${data.items?.length || 0} videos from YouTube API`)
    
    // If we have videos, get additional details for each video
    const videoItems = []
    
    if (data.items && data.items.length > 0) {
      // Get video IDs
      const videoIds = data.items.map((item: any) => item.id.videoId).join(',')
      
      // Fetch detailed video information
      const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${apiKey}`
      const detailsResponse = await fetch(videoDetailsUrl)
      
      if (!detailsResponse.ok) {
        const errorText = await detailsResponse.text().catch(() => detailsResponse.statusText)
        console.error(`YouTube API error fetching video details (${detailsResponse.status}): ${errorText}`)
        throw new Error(`YouTube API error fetching video details: ${detailsResponse.statusText}`)
      }
      
      const detailsData = await detailsResponse.json()
      
      // Format video data
      if (detailsData.items && detailsData.items.length > 0) {
        for (const item of detailsData.items) {
          videoItems.push({
            id: item.id,
            title: item.snippet.title,
            url: `https://www.youtube.com/watch?v=${item.id}`,
            timestamp: item.snippet.publishedAt,
            views: parseInt(item.statistics.viewCount || '0', 10),
            likes: parseInt(item.statistics.likeCount || '0', 10)
          })
        }
      }
    }
    
    // Return formatted YouTube data
    return {
      video_count: videoItems.length,
      video_urls: videoItems.map(v => v.url),
      videos: videoItems
    }
  } catch (error) {
    console.error('Error fetching YouTube data:', error)
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