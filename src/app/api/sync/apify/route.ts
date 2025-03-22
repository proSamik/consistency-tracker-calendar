import { NextRequest, NextResponse } from 'next/server'
import { createDbClient, executeWithRetry } from '@/lib/db'
import { users, activities } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getLoggedInUser } from '@/lib/auth'
import { format, parseISO, subDays } from 'date-fns'

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
    // Get request data
    const requestData = await request.json().catch(() => ({}))
    const { date, platform, userId } = requestData
    
    let user;
    
    // If userId is provided, this is a request from the cron job
    // Otherwise, get the currently logged in user
    if (userId) {
      // Check if this is a cron job request with the proper authorization
      const authHeader = request.headers.get('Authorization')
      if (process.env.CRON_SECRET && (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== process.env.CRON_SECRET)) {
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
    
    // Get user's timezone offset from the request headers
    const timezoneOffset = request.headers.get('x-timezone-offset') || '0';
    const userTimezoneOffsetMinutes = parseInt(timezoneOffset, 10) || 0;
    
    console.log(`User timezone offset: ${userTimezoneOffsetMinutes} minutes from UTC`);
    
    // For context: negative offset means west of UTC (e.g., -330 for IST which is UTC+5:30)
    // browser's getTimezoneOffset() returns the opposite of what we might expect
    const timezoneDesc = userTimezoneOffsetMinutes < 0 
      ? `UTC+${Math.abs(userTimezoneOffsetMinutes/60)}`  // East of UTC
      : `UTC-${userTimezoneOffsetMinutes/60}`;           // West of UTC
      
    console.log(`User timezone: ${timezoneDesc}`);
    
    if (!platform || !isPlatform(platform)) {
      return NextResponse.json(
        { error: 'Invalid or missing platform. Must be twitter or instagram' },
        { status: 400 }
      )
    }
    
    // Parse date or use current date if not provided, considering timezone
    let targetDate: Date;
    if (date) {
      targetDate = parseISO(date);
      console.log(`Using provided date: ${date}, parsed as: ${formatDate(targetDate)}`);
    } else {
      // Use current date without adjustment
      targetDate = new Date();
      console.log(`Using current date: ${formatDate(targetDate)}`);
    }
    
    // Format the target date for display and database storage
    const formattedDate = formatDate(targetDate);
    console.log(`Target date for API and database: ${formattedDate}`);
    
    // For Instagram debugging, show UTC time as well
    if (platform === 'instagram') {
      // Calculate what this date would be in UTC (for debugging Instagram API expectations)
      const utcDate = new Date(targetDate.getTime() + (userTimezoneOffsetMinutes * 60000));
      console.log(`Instagram: This date in UTC is: ${formatDate(utcDate)} (${utcDate.toISOString()})`);
      console.log(`Instagram: When API returns UTC timestamp like 2025-03-21T19:37:41.000Z, it will be converted to local: ${formatDate(targetDate)}`);
    }
    
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
    const platformData = await fetchPlatformData(platform, platformUsername, targetDate, apifyToken, userTimezoneOffsetMinutes)
    
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
 * @param userTimezoneOffsetMinutes User's timezone offset in minutes
 * @returns Platform-specific data
 */
async function fetchPlatformData(
  platform: string, 
  username: string, 
  date: Date,
  apifyToken: string,
  userTimezoneOffsetMinutes: number = 0
) {
  // Get the appropriate actor ID for the platform
  const actorId = getActorId(platform)
  
  // Store the original user's local date for comparison later
  const userLocalDateString = formatDate(date);
  
  // For API requests, we need to adjust dates based on the platform's expectations
  let formattedDate: string;
  
  if (platform === 'twitter') {
    // Twitter API works with UTC dates, so adjust the user's local date to UTC
    const utcDate = new Date(date.getTime() + (userTimezoneOffsetMinutes * 60000));
    formattedDate = formatDate(utcDate);
    console.log(`Twitter: Using UTC-adjusted date for API: ${formattedDate} (original local: ${userLocalDateString})`);
  } else if (platform === 'instagram') {
    // Instagram API uses UTC dates but we'll filter locally after fetching
    // For Instagram, we need to check a wider date range to account for timezone differences
    // So we use the previous day as the cutoff to ensure we capture posts in all timezones
    const instagramDate = subDays(date, 1);
    formattedDate = formatDate(instagramDate);
    console.log(`Instagram: Using previous day as cutoff for API: ${formattedDate}, will filter to ${userLocalDateString} after fetching`);
  } else {
    // Default: use the local date as is
    formattedDate = formatDate(date);
  }
  
  console.log(`Starting Apify actor run for ${platform}, actor: ${actorId}, username: ${username}, API date parameter: ${formattedDate}`)
  
  let input = {}
  
  // Different platforms need different input formats
  if (platform === 'twitter') {
    input = {
      start_urls: [
        {
          url: `https://x.com/${username}`
        }
      ],
      since_date: formattedDate,
    }
  } else if (platform === 'instagram') {
    // For Instagram, we use a wider date range and filter locally after
    input = {
      "addParentData": false,
      "directUrls": [
        `https://www.instagram.com/${username}/`
      ],
      "enhanceUserSearchWithFacebookPage": false,
      "isUserReelFeedURL": false,
      "isUserTaggedFeedURL": false,
      "onlyPostsNewerThan": formattedDate, // Use the previous day to catch all posts
      "resultsLimit": 100, // Increased limit to ensure we get all posts
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
        
        // Use the user's local date for filtering, not the UTC-adjusted date
        return formatPlatformData(platform, items, userLocalDateString, userTimezoneOffsetMinutes)
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
 * @param userTimezoneOffsetMinutes User's timezone offset in minutes
 * @returns Formatted platform data
 */
function formatPlatformData(platform: string, items: any[], date: string, userTimezoneOffsetMinutes: number = 0) {
  console.log(`Formatting data for ${platform} with ${items.length} items, target date: ${date} (user's local date)`)
  
  // Filter items by date if needed
  const filteredItems = items.filter(item => {
    // Different platforms return dates in different formats
    let itemDate = null
    
    if (platform === 'twitter') {
      // Extract the date from the Twitter response
      if (item.created_at) {
        // Handle Twitter date format: "Fri Mar 21 20:33:52 +0000 2025"
        // For Twitter comparison, we need to use the original target date, not the UTC-adjusted one
        // that was sent to the API, as we're now working with the actual tweet dates
        const rawItemDate = new Date(item.created_at);
        const localItemDate = new Date(rawItemDate.getTime() - (userTimezoneOffsetMinutes * 60000));
        
        itemDate = localItemDate;
        
        // Additional logging for debugging Twitter date handling
        console.log(`Twitter date: ${item.created_at}, raw UTC: ${formatDate(rawItemDate)}, local: ${formatDate(localItemDate)}, target: ${date}`);
      } else {
        itemDate = item.date || item.postedAt || item.createdAtFormatted || item.timestamp || item.createdAt;
      }
      
      // Get only the date part in user's local timezone
      if (itemDate) {
        const itemDateString = formatDate(new Date(itemDate));
        const result = itemDateString === date;
        
        if (result) {
          console.log(`Found matching Twitter date: ${itemDateString} === ${date}`);
          console.log(`Tweet text: ${item.full_text || item.text}`);
        }
        
        return result;
      }
      
      return false;
    } else if (platform === 'instagram') {
      // Instagram returns timestamps in ISO format with 'Z' indicating UTC time (e.g., "2025-03-21T19:37:41.000Z")
      itemDate = item.timestamp || item.taken_at || item.taken_at_timestamp || 
                (item.node && item.node.taken_at_timestamp ? new Date(item.node.taken_at_timestamp * 1000).toISOString() : null)
      
      // If we have a Unix timestamp (seconds since epoch), convert to ISO
      if (typeof itemDate === 'number') {
        itemDate = new Date(itemDate * 1000).toISOString()
      }
      
      if (!itemDate) return false;
      
      // Parse the UTC timestamp
      const rawItemDate = new Date(itemDate);
      
      // Convert UTC timestamp to user's local timezone by subtracting the timezone offset
      // userTimezoneOffsetMinutes is the offset in minutes, positive for east of UTC
      const localItemDate = new Date(rawItemDate.getTime() - (userTimezoneOffsetMinutes * 60000));
      const itemDateFormatted = formatDate(localItemDate);
      
      console.log(`Instagram item: ${item.caption ? item.caption.substring(0, 30) + '...' : 'No caption'}`);
      console.log(`Instagram date: ${itemDate}, raw UTC: ${formatDate(rawItemDate)}, adjusted local: ${itemDateFormatted}, target: ${date}`);
      
      const result = itemDateFormatted === date;
      if (result) {
        console.log(`Found matching Instagram post for date: ${itemDateFormatted} === ${date}`);
        console.log(`Post URL: ${item.url}`);
      }
      return result;
    }
    
    return false;
  })
  
  console.log(`Filtered to ${filteredItems.length} items with date: ${date}`)
  
  switch (platform) {
    case 'twitter': {
      const tweets = filteredItems.map(item => ({
        id: item.id_str || item.id,
        text: item.full_text || item.text || '',
        url: item.url || `https://twitter.com/i/status/${item.id_str || item.id}`,
        timestamp: item.created_at || item.timestamp || item.createdAt,
        likes: item.favorite_count || item.likeCount || 0,
        retweets: item.retweet_count || item.retweetCount || 0,
        views: item.views_count || 0
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
        
        // Store both the original UTC timestamp and the local timestamp
        const timestamp = node.timestamp || 
                     (node.taken_at_timestamp ? new Date(node.taken_at_timestamp * 1000).toISOString() : null) || 
                     new Date().toISOString();
        
        const utcDate = new Date(timestamp);
        const localDate = new Date(utcDate.getTime() - (userTimezoneOffsetMinutes * 60000));
        
        return {
          id: node.id || node.pk || '',
          type: node.type || node.media_type || node.__typename || 'post',
          url: node.url || node.permalink || `https://www.instagram.com/p/${node.shortcode || node.code}/` || '',
          timestamp: timestamp,
          localTimestamp: localDate.toISOString(), // Add local timestamp for reference
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
      return 'gentle_cloud~twitter-tweets-scraper' // Updated ID for Twitter (X) Scraper
    case 'instagram':
      return 'apify~instagram-scraper' // Updated ID for Instagram Scraper
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
} 