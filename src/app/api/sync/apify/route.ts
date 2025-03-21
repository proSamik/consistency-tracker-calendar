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

// Type guard for platform string
function isPlatform(value: string): value is 'twitter' | 'instagram' | 'youtube' {
  return ['twitter', 'instagram', 'youtube'].includes(value);
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
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in.' }, 
        { status: 401 }
      )
    }

    // Get request data
    const requestData = await request.json()
    const { date, platform, channelId } = requestData
    
    if (!platform || !isPlatform(platform)) {
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

    // For YouTube, we can use the channelId directly if provided
    if (platform === 'youtube' && channelId) {
      try {
        const fixedChannelId = "UCNQ6FEtztATuaVhZKCY28Yw"
        const platformData = await fetchYouTubeData(fixedChannelId, targetDate)
        
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
    }
    
    // Get the appropriate username for the requested platform
    let platformUsername: string | null = null;
    
    // Type-safe access for each platform
    if (platform === 'twitter') {
      platformUsername = userData.twitter_username;
    } else if (platform === 'instagram') {
      platformUsername = userData.instagram_username;
    } else if (platform === 'youtube') {
      platformUsername = userData.youtube_username;
    }
    
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
            eq(activities.username, userData.username || ''),
            eq(activities.activity_date, formattedDate)
          )
        )
        .limit(1)
      
      // Calculate the count to add to total_activity_count
      const countToAdd = getPlatformItemCount(platformData)
      
      // Calculate the count to subtract from existing record (if any)
      let countToSubtract = 0;
      if (existingActivity.length > 0) {
        // Type-safe access to platform data
        if (platform === 'twitter') {
          countToSubtract = getPlatformItemCount(existingActivity[0].twitter_data);
        } else if (platform === 'instagram') {
          countToSubtract = getPlatformItemCount(existingActivity[0].instagram_data);
        } else if (platform === 'youtube') {
          countToSubtract = getPlatformItemCount(existingActivity[0].youtube_data);
        }
      }
      
      if (existingActivity.length > 0) {
        // Update existing record with new platform data
        const updateData: any = {
          last_synced: new Date(),
          // Update total activity count
          total_activity_count: (existingActivity[0].total_activity_count || 0) - countToSubtract + countToAdd
        }
        
        // Add platform-specific data in a type-safe way
        if (platform === 'twitter') {
          updateData.twitter_data = platformData;
        } else if (platform === 'instagram') {
          updateData.instagram_data = platformData;
        } else if (platform === 'youtube') {
          updateData.youtube_data = platformData;
        }
        
        await db.update(activities)
          .set(updateData)
          .where(
            and(
              eq(activities.username, userData.username || ''),
              eq(activities.activity_date, formattedDate)
            )
          )
      } else {
        // Insert new record
        const insertData: any = {
          username: userData.username || '',
          activity_date: formattedDate,
          last_synced: new Date(),
          total_activity_count: countToAdd
        }
        
        // Add platform-specific data in a type-safe way
        if (platform === 'twitter') {
          insertData.twitter_data = platformData;
        } else if (platform === 'instagram') {
          insertData.instagram_data = platformData;
        } else if (platform === 'youtube') {
          insertData.youtube_data = platformData;
        }
        
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
  // Special case for YouTube - use direct API instead of Apify
  if (platform === 'youtube') {
    // For YouTube, use the YouTube API with the channel ID
    return await fetchYouTubeData("UCNQ6FEtztATuaVhZKCY28Yw", date);
  }
  
  // Get the appropriate actor ID for the platform
  const actorId = getActorId(platform)
  const formattedDate = formatDate(date)
  
  console.log(`Starting Apify actor run for ${platform}, actor: ${actorId}, username: ${username}, date: ${formattedDate}`)
  
  let input = {}
  
  // Different platforms need different input formats
  if (platform === 'twitter') {
    input = {
      searchTerms: [`from:${username}`],
      maxTweets: 50,
      startFromDate: formattedDate,
      endAtDate: formattedDate
    }
  } else if (platform === 'instagram') {
    input = {
      usernames: [username],
      resultsLimit: 100,
      resultsType: 'posts',
      addParentData: true,
      proxy: { useApifyProxy: true }
    }
  }
  
  try {
    // Call Apify API to start the actor and wait for results
    console.log(`Calling Apify API with actor ID: ${actorId}`)
    console.log(`Input data:`, JSON.stringify(input))
    
    const startResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input })
    })
    
    if (!startResponse.ok) {
      const errorText = await startResponse.text().catch(() => startResponse.statusText)
      console.error(`Apify error starting actor (${startResponse.status}): ${errorText}`)
      
      if (startResponse.status === 404) {
        throw new Error(`Apify actor ID '${actorId}' not found. The actor may have been renamed or removed.`)
      } else if (startResponse.status === 401) {
        throw new Error(`Apify authentication failed. Please check your Apify token.`)
      } else {
        throw new Error(`Apify error starting actor: ${startResponse.statusText}`)
      }
    }
    
    const startData = await startResponse.json()
    
    if (!startData.data || !startData.data.id) {
      console.error('Invalid response from Apify:', startData)
      throw new Error('Invalid response from Apify when starting the actor run')
    }
    
    const runId = startData.data.id
    console.log(`Apify actor run started with ID: ${runId}`)
    
    // Poll for completion
    const maxAttempts = 30
    const pollInterval = 2000 // 2 seconds
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Wait before polling
      await new Promise(resolve => setTimeout(resolve, pollInterval))
      
      // Check run status
      console.log(`Polling run status, attempt ${attempt + 1}/${maxAttempts}`)
      const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`)
      
      if (!statusResponse.ok) {
        const errorText = await statusResponse.text().catch(() => statusResponse.statusText)
        console.error(`Apify error checking run status (${statusResponse.status}): ${errorText}`)
        throw new Error(`Apify error checking run status: ${statusResponse.statusText}`)
      }
      
      const statusData = await statusResponse.json()
      console.log(`Current run status: ${statusData.data.status}`)
      
      if (['SUCCEEDED', 'FINISHED'].includes(statusData.data.status)) {
        // Get dataset items
        const datasetId = statusData.data.defaultDatasetId
        console.log(`Run completed successfully. Fetching results from dataset: ${datasetId}`)
        
        if (!datasetId) {
          console.error('No dataset ID in the response:', statusData)
          throw new Error('No dataset ID in the Apify response')
        }
        
        const itemsResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`)
        
        if (!itemsResponse.ok) {
          const errorText = await itemsResponse.text().catch(() => itemsResponse.statusText)
          console.error(`Apify error fetching dataset items (${itemsResponse.status}): ${errorText}`)
          throw new Error(`Apify error fetching dataset items: ${itemsResponse.statusText}`)
        }
        
        const items = await itemsResponse.json()
        console.log(`Retrieved ${items.length} items from dataset`)
        
        // Format data based on platform
        return formatPlatformData(platform, items, formattedDate)
      }
      
      if (['FAILED', 'ABORTED', 'TIMED_OUT'].includes(statusData.data.status)) {
        console.error(`Apify actor run failed with status: ${statusData.data.status}`)
        if (statusData.data.errorMessage) {
          console.error(`Error message: ${statusData.data.errorMessage}`)
          throw new Error(`Apify actor run failed: ${statusData.data.errorMessage}`)
        }
        throw new Error(`Apify actor run failed with status: ${statusData.data.status}`)
      }
    }
    
    throw new Error('Apify actor run timed out after maximum polling attempts')
  } catch (error) {
    console.error(`Error in fetchPlatformData for ${platform}:`, error)
    throw error
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

/**
 * Get the appropriate Apify actor ID for a given platform
 * @param platform The platform name
 * @returns Apify actor ID
 */
function getActorId(platform: string): string {
  switch (platform) {
    case 'twitter':
      return 'apidojo/tweet-scraper' // Updated ID for Twitter (X) Scraper
    case 'instagram':
      return 'apify/instagram-scraper' // Updated ID for Instagram Scraper
    case 'youtube':
      return 'streamers/youtube-scraper' // Updated ID for YouTube Scraper
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
} 