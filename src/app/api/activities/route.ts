import { NextRequest, NextResponse } from 'next/server'
import { createDbClient, executeWithRetry } from '@/lib/db'
import { activities } from '@/lib/db/schema'
import { eq, and, between, desc } from 'drizzle-orm'
import { getLoggedInUser } from '@/lib/auth'
import { addDays, subDays, parseISO, format } from 'date-fns'

/**
 * API route to fetch user activities for calendar view
 * @param request The incoming request
 * @returns JSON response with activity data
 */
export async function GET(request: NextRequest) {
  try {
    // Get the currently logged in user
    const user = await getLoggedInUser()
    if (!user || !user.username) {
      return NextResponse.json(
        { error: 'Unauthorized or missing username' }, 
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    
    // If username is provided in the query, use that instead of the logged-in user
    // This allows viewing other users' public activity calendars
    const targetUsername = searchParams.get('username') || user.username
    
    // Parse start and end dates if provided
    let startDate = searchParams.get('start') 
      ? parseISO(searchParams.get('start') as string)
      : subDays(new Date(), 365) // Default to last year
      
    let endDate = searchParams.get('end')
      ? parseISO(searchParams.get('end') as string) 
      : new Date() // Default to today
    
    // Format dates for database query
    const formattedStartDate = format(startDate, 'yyyy-MM-dd')
    const formattedEndDate = format(endDate, 'yyyy-MM-dd')
    
    // Fetch activities for the specified date range
    const db = createDbClient()
    const activityData = await executeWithRetry(async () => {
      return db.select()
        .from(activities)
        .where(
          and(
            eq(activities.username, targetUsername as string),
            between(activities.activity_date, formattedStartDate, formattedEndDate)
          )
        )
        .orderBy(desc(activities.activity_date))
    })
    
    // Transform data for calendar view
    const calendarData = activityData.map(activity => ({
      date: activity.activity_date,
      count: activity.total_activity_count || 0,
      // Include platform-specific counts
      github: (activity.github_data as any)?.contributions || 0,
      twitter: (activity.twitter_data as any)?.tweet_count || 0,
      youtube: (activity.youtube_data as any)?.video_count || 0,
      instagram: (activity.instagram_data as any)?.post_count || 0,
      // Add last synced timestamp
      lastSynced: activity.last_synced
    }))
    
    return NextResponse.json({
      username: targetUsername,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      activities: calendarData
    })
  } catch (error) {
    console.error('Error fetching activity data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity data' },
      { status: 500 }
    )
  }
}

/**
 * API route to get details for a specific day's activities
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
    const { date, username } = requestData
    
    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      )
    }
    
    // Use provided username or default to logged-in user
    const targetUsername = username || user.username
    
    // Parse date
    const parsedDate = typeof date === 'string' ? parseISO(date) : new Date(date)
    const formattedDate = format(parsedDate, 'yyyy-MM-dd')
    
    // Fetch activity for the specific date
    const db = createDbClient()
    const activityData = await executeWithRetry(async () => {
      const results = await db.select()
        .from(activities)
        .where(
          and(
            eq(activities.username, targetUsername as string),
            eq(activities.activity_date, formattedDate)
          )
        )
        .limit(1)
      
      return results.length > 0 ? results[0] : null
    })
    
    if (!activityData) {
      return NextResponse.json(
        { error: 'No activity found for this date' },
        { status: 404 }
      )
    }
    
    // Format detailed activity data
    const detailedData = {
      date: formattedDate,
      username: targetUsername,
      totalCount: activityData.total_activity_count || 0,
      lastSynced: activityData.last_synced,
      
      // Platform-specific details
      github: activityData.github_data,
      twitter: activityData.twitter_data,
      youtube: activityData.youtube_data,
      instagram: activityData.instagram_data,
      
      // Any custom activities
      custom: activityData.custom_activities
    }
    
    return NextResponse.json(detailedData)
  } catch (error) {
    console.error('Error fetching detailed activity data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch detailed activity data' },
      { status: 500 }
    )
  }
} 