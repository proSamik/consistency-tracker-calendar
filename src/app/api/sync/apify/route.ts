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
function isPlatform(value: string): value is 'twitter' | 'instagram' {
  return ['twitter', 'instagram'].includes(value);
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
    const { date, platform } = requestData
    
    if (!platform || !isPlatform(platform)) {
      return NextResponse.json(
        { error: 'Invalid or missing platform. Must be twitter or instagram' },
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

    // Get the appropriate username for the requested platform
    let platformUsername: string | null = null;
    
    // Type-safe access for each platform
    if (platform === 'twitter') {
      platformUsername = userData.twitter_username;
    } else if (platform === 'instagram') {
      platformUsername = userData.instagram_username;
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
    
    // Log Instagram actor output to terminal
    if (platform === 'instagram') {
      console.log('Instagram Actor Output:', platformData);
    }

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
    // For Instagram, we create a user-specific configuration
    input = {
    "addParentData": false,
    "directUrls": [
      `https://www.instagram.com/${username}/`
    ],
    "enhanceUserSearchWithFacebookPage": false,
    "isUserReelFeedURL": true,
    "isUserTaggedFeedURL": false,
    "onlyPostsNewerThan": formattedDate,
    "resultsLimit": 10,
    "resultsType": "posts",
    "searchLimit": 1,
    "searchType": "hashtag"
    }
  }
  
  try {
    // Call Apify API to start the actor and wait for results
    console.log(`Calling Apify API with actor ID: ${actorId}`)
    console.log(`Input data:`, JSON.stringify(input))
    
    // Important: Do not wrap the input data inside another object
    const startResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input)
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
    const pollInterval = 5000 // 5 seconds
    
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
        console.log('Instagram Actor Output:', items);
        
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
 * Format platform data based on platform type
 * @param platform The platform name
 * @param items Items from Apify
 * @param date Target date string
 * @returns Formatted platform data
 */
function formatPlatformData(platform: string, items: any[], date: string) {
  console.log(`Formatting data for ${platform} with ${items.length} items, target date: ${date}`)
  
  // Filter items by date if needed
  const filteredItems = items.filter(item => {
    // Different platforms return dates in different formats
    let itemDate = null
    
    if (platform === 'twitter') {
      itemDate = item.date || item.postedAt || item.createdAtFormatted || item.timestamp || item.createdAt
    } else if (platform === 'instagram') {
      // Instagram can return timestamps in many formats
      itemDate = item.timestamp || item.taken_at || item.taken_at_timestamp || 
                (item.node && item.node.taken_at_timestamp ? new Date(item.node.taken_at_timestamp * 1000).toISOString() : null)
      
      // If we have a Unix timestamp (seconds since epoch), convert to ISO
      if (typeof itemDate === 'number') {
        itemDate = new Date(itemDate * 1000).toISOString()
      }
    }
    
    if (!itemDate) return false
    
    // Convert to YYYY-MM-DD format for comparison
    let itemDateFormatted = ''
    if (typeof itemDate === 'string') {
      itemDateFormatted = itemDate.substring(0, 10)
    } else if (itemDate instanceof Date) {
      itemDateFormatted = formatDate(itemDate)
    } else {
      return false
    }
    
    const result = itemDateFormatted === date
    if (result) {
      console.log(`Found matching date: ${itemDateFormatted} === ${date}`)
    }
    return result
  })
  
  console.log(`Filtered to ${filteredItems.length} items with date: ${date}`)
  
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
      console.log('Formatting Instagram data, filtered items:', filteredItems.length)
      
      // Instagram API might return posts directly or might have a different structure
      const posts = filteredItems.map(item => {
        // Handle potential nested structures (Instagram API has changed formats several times)
        const node = item.node || item
        
        return {
          id: node.id || node.pk || '',
          type: node.type || node.media_type || node.__typename || 'post',
          url: node.url || node.permalink || `https://www.instagram.com/p/${node.shortcode || node.code}/` || '',
          timestamp: node.timestamp || (node.taken_at_timestamp ? new Date(node.taken_at_timestamp * 1000).toISOString() : null) || new Date().toISOString(),
          caption: node.caption || node.edge_media_to_caption?.edges[0]?.node?.text || '',
          likes: node.likesCount || node.like_count || node.edge_media_preview_like?.count || 0,
          comments: node.commentsCount || node.comment_count || node.edge_media_to_comment?.count || 0
        }
      })
      
      return {
        post_count: posts.length,
        post_urls: posts.map(p => p.url).filter(url => url), // Filter out empty URLs
        posts: posts
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
      return 'apidojo~tweet-scraper' // Updated ID for Twitter (X) Scraper
    case 'instagram':
      return 'apify~instagram-scraper' // Updated ID for Instagram Scraper
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
} 