import { NextRequest, NextResponse } from 'next/server'
import { createDbClient, executeWithRetry } from '@/lib/db'
import { activities, users } from '@/lib/db/schema'
import { eq, and, between, desc, count, sum } from 'drizzle-orm'
import { addDays, subDays, parseISO, format } from 'date-fns'

/**
 * GET handler for /api/activities
 * Fetches aggregated activities across all platforms
 *
 * Query parameters:
 * - username: required
 * - start: required (YYYY-MM-DD)
 * - end: required (YYYY-MM-DD)
 * - isPublicView: optional boolean to respect privacy settings
 */
export async function GET(request: NextRequest) {
  // Get query parameters
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const isPublicView = searchParams.get('isPublicView') === 'true'
  
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }
  
  if (!start || !end) {
    return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 })
  }
  
  try {
    const db = createDbClient()
    
    // Get the user's privacy settings if in public view
    let userPrivacy = {
      github_private: false,
      twitter_private: false,
      instagram_private: false,
      youtube_private: false
    }
    
    if (isPublicView) {
      // Retrieve user data from the database
      const userData = await executeWithRetry(async () => {
        // Use SELECT with proper select expressions to match schema
        const results = await db.select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1)
        
        return results
      })
      
      if (userData.length > 0) {
        // No privacy fields on user table, we'll check in activities
      }
    }
    
    const activityData = await executeWithRetry(async () => {
      return await db.select()
        .from(activities)
        .where(
          and(
            eq(activities.username, username),
            between(activities.activity_date, start, end)
          )
        )
        .orderBy(desc(activities.activity_date))
    })
    
    // Process activities to respect privacy settings in public view
    const processedActivities = activityData.map(activity => {
      // Create base activity object with counts from JSON data
      const githubData = activity.github_data as any || { contributions: 0, repositories: [] }
      const twitterData = activity.twitter_data as any || { tweet_count: 0, tweet_urls: [] }
      const instagramData = activity.instagram_data as any || { post_count: 0, post_urls: [] }
      const youtubeData = activity.youtube_data as any || { video_count: 0, video_urls: [] }
      
      // Get counts from each platform's data
      const githubCount = githubData.contributions || 0
      const twitterCount = twitterData.tweet_count || 0
      const instagramCount = instagramData.post_count || 0
      const youtubeCount = youtubeData.video_count || 0
      
      // Create activity item with non-null counts
      const activityItem = {
        date: activity.activity_date,
        count: activity.total_activity_count || 0,
        github: githubCount,
        twitter: twitterCount,
        instagram: instagramCount,
        youtube: youtubeCount
      }
      
      // If in public view, respect privacy settings
      if (isPublicView) {
        if (activity.github_private) activityItem.github = 0
        if (activity.twitter_private) activityItem.twitter = 0
        if (activity.instagram_private) activityItem.instagram = 0
        if (activity.youtube_private) activityItem.youtube = 0
        
        // Recalculate total count based on privacy settings
        activityItem.count = (
          activityItem.github + 
          activityItem.twitter + 
          activityItem.instagram + 
          activityItem.youtube
        )
      }
      
      return activityItem
    })
    
    return NextResponse.json({
      username: username,
      startDate: start,
      endDate: end,
      activities: processedActivities
    })
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch activities data'
    }, { status: 500 })
  }
}

/**
 * POST handler for /api/activities
 * Returns detailed activity data for a specific date
 * If isPublicView=true, respects privacy settings
 */
export async function POST(request: NextRequest) {
  try {
    // Get request data
    const requestData = await request.json()
    const { date, username, isPublicView } = requestData
    
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }
    
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }
    
    // Fetch activity data for the specified date
    const db = createDbClient()
    const activityData = await executeWithRetry(async () => {
      const result = await db.select()
        .from(activities)
        .where(
          and(
            eq(activities.username, username),
            eq(activities.activity_date, date)
          )
        )
        .limit(1)
      
      return result.length > 0 ? result[0] : null
    })
    
    if (!activityData) {
      return NextResponse.json({ 
        activity: null,
        message: 'No activity found for this date' 
      }, { status: 200 })
    }
    
    // Extract platform data
    const githubData = activityData.github_data as any || { contributions: 0, repositories: [] }
    const twitterData = activityData.twitter_data as any || { tweet_count: 0, tweet_urls: [], tweets: [] }
    const instagramData = activityData.instagram_data as any || { post_count: 0, post_urls: [], posts: [] }
    const youtubeData = activityData.youtube_data as any || { video_count: 0, video_urls: [], videos: [] }
    
    // Create detailed activity object
    const detailedActivity = {
      date,
      username,
      totalCount: activityData.total_activity_count || 0,
      lastSynced: activityData.last_synced,
      privacy: {
        github_private: activityData.github_private || false,
        twitter_private: activityData.twitter_private || false,
        instagram_private: activityData.instagram_private || false,
        youtube_private: activityData.youtube_private || false
      },
      github: isPublicView && activityData.github_private 
        ? { contributions: 0, repositories: [] } 
        : { 
            contributions: githubData.contributions || 0, 
            repositories: githubData.repositories || [] 
          },
      twitter: isPublicView && activityData.twitter_private 
        ? { tweet_count: 0, tweet_urls: [], tweets: [] } 
        : { 
            tweet_count: twitterData.tweet_count || 0, 
            tweet_urls: twitterData.tweet_urls || [],
            tweets: twitterData.tweets || [] 
          },
      instagram: isPublicView && activityData.instagram_private 
        ? { post_count: 0, post_urls: [], posts: [] } 
        : { 
            post_count: instagramData.post_count || 0, 
            post_urls: instagramData.post_urls || [],
            posts: instagramData.posts || [] 
          },
      youtube: isPublicView && activityData.youtube_private 
        ? { video_count: 0, video_urls: [], videos: [] } 
        : { 
            video_count: youtubeData.video_count || 0, 
            video_urls: youtubeData.video_urls || [],
            videos: youtubeData.videos || [] 
          }
    }
    
    // Recalculate total count if in public view to respect privacy
    if (isPublicView) {
      detailedActivity.totalCount = (
        detailedActivity.github.contributions +
        detailedActivity.twitter.tweet_count +
        detailedActivity.instagram.post_count +
        detailedActivity.youtube.video_count
      )
    }
    
    return NextResponse.json({ activity: detailedActivity })
  } catch (error) {
    console.error('Error fetching activity details:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch activity details' 
    }, { status: 500 })
  }
} 