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
 * API route to sync social media data from Apify
 * @param request The incoming request
 * @returns JSON response with synced data
 */
export async function POST(request: NextRequest) {
  try {
    // Get the currently logged in user
    const user = await getLoggedInUser()
    if (!user || !user.username) {
      return NextResponse.json(
        { error: 'Unauthorized or missing username' }, 
        { status: 401 }
      )
    }

    // Get request data
    const requestData = await request.json()
    const { date, platform } = requestData
    
    if (!platform || !['twitter', 'instagram', 'youtube'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid or missing platform. Must be twitter, instagram, or youtube' },
        { status: 400 }
      )
    }
    
    // Parse date or use current date if not provided
    const targetDate = date ? parseISO(date) : new Date()
    const formattedDate = formatDate(targetDate)
    
    // Get user profile data with social media usernames
    const db = createDbClient()
    const userData = await executeWithRetry(async () => {
      const userResults = await db.select()
        .from(users)
        .where(eq(users.username, user.username as string))
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

    // Get the appropriate username for the requested platform
    const platformUsername = userData[`${platform}_username`]
    
    if (!platformUsername) {
      return NextResponse.json(
        { error: `${platform} username not found in profile` },
        { status: 400 }
      )
    }

    // Get Apify API token from environment variables
    const apifyToken = process.env.APIFY_TOKEN
    if (!apifyToken) {
      return NextResponse.json(
        { error: 'Apify token not configured' },
        { status: 500 }
      )
    }

    // Call appropriate Apify actor based on platform
    const platformData = await fetchPlatformData(platform, platformUsername, targetDate, apifyToken)
    
    // Update or insert activity data in the database
    await executeWithRetry(async () => {
      // Check if activity record exists for this date
      const existingActivity = await db.select()
        .from(activities)
        .where(
          and(
            eq(activities.username, user.username as string),
            eq(activities.activity_date, formattedDate)
          )
        )
        .limit(1)
      
      // Calculate the count to add to total_activity_count
      const countToAdd = getPlatformItemCount(platformData)
      // Calculate the count to subtract from existing record (if any)
      const countToSubtract = existingActivity.length > 0 
        ? getPlatformItemCount(existingActivity[0][`${platform}_data`]) 
        : 0
      
      if (existingActivity.length > 0) {
        // Update existing record with new platform data
        const updateData: any = {
          last_synced: new Date(),
          // Update total activity count
          total_activity_count: (existingActivity[0].total_activity_count || 0) - countToSubtract + countToAdd
        }
        
        // Add platform-specific data
        updateData[`${platform}_data`] = platformData
        
        await db.update(activities)
          .set(updateData)
          .where(
            and(
              eq(activities.username, user.username as string),
              eq(activities.activity_date, formattedDate)
            )
          )
      } else {
        // Insert new record
        const insertData: any = {
          username: user.username as string,
          activity_date: formattedDate,
          last_synced: new Date(),
          total_activity_count: countToAdd
        }
        
        // Add platform-specific data
        insertData[`${platform}_data`] = platformData
        
        await db.insert(activities).values(insertData)
      }
    })

    return NextResponse.json({
      message: `${platform} data synced successfully`,
      date: formattedDate,
      data: platformData
    })
  } catch (error) {
    console.error('Error syncing social media data:', error)
    return NextResponse.json(
      { error: 'Failed to sync social media data' },
      { status: 500 }
    )
  }
}

/**
 * Fetch data from a specific platform using Apify
 * @param platform The platform to fetch data from
 * @param username The username to fetch data for
 * @param date The target date
 * @param apifyToken Apify API token
 * @returns Platform-specific data
 */
async function fetchPlatformData(
  platform: string, 
  username: string, 
  date: Date,
  apifyToken: string
) {
  // Get the appropriate actor ID for the platform
  const actorId = getActorId(platform)
  const formattedDate = formatDate(date)
  
  const input = {
    username,
    startDate: formattedDate,
    endDate: formattedDate
  }
  
  // Call Apify API to start the actor and wait for results
  const startResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyToken}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input })
  })
  
  if (!startResponse.ok) {
    throw new Error(`Apify error starting actor: ${startResponse.statusText}`)
  }
  
  const startData = await startResponse.json()
  const runId = startData.data.id
  
  // Poll for completion
  const maxAttempts = 30
  const pollInterval = 2000 // 2 seconds
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Wait before polling
    await new Promise(resolve => setTimeout(resolve, pollInterval))
    
    // Check run status
    const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`)
    
    if (!statusResponse.ok) {
      throw new Error(`Apify error checking run status: ${statusResponse.statusText}`)
    }
    
    const statusData = await statusResponse.json()
    
    if (['SUCCEEDED', 'FINISHED'].includes(statusData.data.status)) {
      // Get dataset items
      const datasetId = statusData.data.defaultDatasetId
      const itemsResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`)
      
      if (!itemsResponse.ok) {
        throw new Error(`Apify error fetching dataset items: ${itemsResponse.statusText}`)
      }
      
      const items = await itemsResponse.json()
      
      // Format data based on platform
      return formatPlatformData(platform, items, formattedDate)
    }
    
    if (['FAILED', 'ABORTED', 'TIMED_OUT'].includes(statusData.data.status)) {
      throw new Error(`Apify actor run failed with status: ${statusData.data.status}`)
    }
  }
  
  throw new Error('Apify actor run timed out')
}

/**
 * Get the appropriate Apify actor ID for a given platform
 * @param platform The platform name
 * @returns Apify actor ID
 */
function getActorId(platform: string): string {
  switch (platform) {
    case 'twitter':
      return 'apify/twitter-scraper'
    case 'instagram':
      return 'apify/instagram-scraper'
    case 'youtube':
      return 'apify/youtube-scraper'
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

/**
 * Format platform data based on platform type
 * @param platform The platform name
 * @param items Items from Apify
 * @param date Target date string
 * @returns Formatted platform data
 */
function formatPlatformData(platform: string, items: any[], date: string) {
  // Filter items by date if needed
  const filteredItems = items.filter(item => {
    // Different platforms return dates in different formats
    const itemDate = item.date || item.postedAt || item.createdAtFormatted || item.timestamp
    if (!itemDate) return false
    
    // Convert to YYYY-MM-DD format for comparison
    const itemDateFormatted = typeof itemDate === 'string' 
      ? itemDate.substring(0, 10) 
      : formatDate(new Date(itemDate))
    
    return itemDateFormatted === date
  })
  
  switch (platform) {
    case 'twitter': {
      const tweets = filteredItems.map(item => ({
        id: item.id,
        text: item.text || item.fullText,
        url: item.url,
        timestamp: item.timestamp || item.createdAt,
        likes: item.likeCount,
        retweets: item.retweetCount
      }))
      
      return {
        tweet_count: tweets.length,
        tweet_urls: tweets.map(t => t.url),
        tweets: tweets
      }
    }
    
    case 'instagram': {
      const posts = filteredItems.map(item => ({
        id: item.id,
        type: item.type,
        url: item.url,
        timestamp: item.timestamp,
        caption: item.caption,
        likes: item.likesCount,
        comments: item.commentsCount
      }))
      
      return {
        post_count: posts.length,
        post_urls: posts.map(p => p.url),
        posts: posts
      }
    }
    
    case 'youtube': {
      const videos = filteredItems.map(item => ({
        id: item.id,
        title: item.title,
        url: item.url,
        timestamp: item.uploadedAt || item.publishedAt,
        views: item.viewCount,
        likes: item.likeCount
      }))
      
      return {
        video_count: videos.length,
        video_urls: videos.map(v => v.url),
        videos: videos
      }
    }
    
    default:
      return {
        item_count: 0,
        items: []
      }
  }
}

/**
 * Get the item count from platform data
 * @param data Platform data
 * @returns Item count
 */
function getPlatformItemCount(data: any): number {
  if (!data) return 0
  
  return data.tweet_count || 
         data.post_count || 
         data.video_count || 
         data.contributions || 
         data.item_count || 
         0
} 