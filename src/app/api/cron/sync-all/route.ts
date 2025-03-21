import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { createDbClient, executeWithRetry } from '@/lib/db'
import { users } from '@/lib/db/schema'

/**
 * Background job that syncs all platforms
 * This endpoint is called by the cron job every 6 hours
 * It can also be protected with a secret key
 */
export async function POST(request: Request) {
  try {
    // Get CRON_SECRET from environment variables
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('CRON_SECRET environment variable is not set')
      return NextResponse.json(
        { error: 'Server configuration error: CRON_SECRET is not configured.' }, 
        { status: 500 }
      )
    }
    
    // Verify API key/secret if provided in request
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized. Valid cron secret required.' }, 
        { status: 401 }
      )
    }

    // Get the current date
    const today = format(new Date(), 'yyyy-MM-dd')
    
    // Define all platforms to sync
    const platformsToSync = ['github', 'twitter', 'instagram', 'youtube']
    const results: Record<string, { success: boolean; message: string }> = {}
    
    // Get database client
    const db = createDbClient()
    
    // Get all users to sync
    const usersData = await executeWithRetry(async () => {
      return await db.select({
        id: users.id,
        username: users.username
      })
      .from(users)
    })
    
    if (!usersData || usersData.length === 0) {
      console.log('No users found to sync')
      return NextResponse.json({ message: 'No users found to sync' }, { status: 200 })
    }
    
    // Process each platform for each user
    for (const user of usersData) {
      console.log(`Processing user: ${user.username}`)
      
      for (const platform of platformsToSync) {
        try {
          // Use different endpoints based on platform
          let endpoint = '/api/sync/apify'
          let body: any = { date: today }
          
          if (platform === 'github') {
            endpoint = '/api/sync/github'
          } else if (platform === 'youtube') {
            endpoint = '/api/sync/youtube'
          } else {
            // For twitter and instagram, use apify endpoint
            body.platform = platform
          }
          
          // Add user ID to the body
          body.userId = user.id
          
          // Get timezone offset
          const timezoneOffset = 0 // Default to UTC for background jobs
          
          console.log(`Syncing ${platform} for user ${user.username}`)
          
          // Call platform-specific sync API
          const response = await fetch(new URL(endpoint, request.url).toString(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-timezone-offset': timezoneOffset.toString(),
              // Pass cron secret for authorization
              'Authorization': `Bearer ${cronSecret}`
            },
            body: JSON.stringify(body),
          })
          
          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`API error (${response.status}): ${errorText}`)
          }
          
          results[`${user.username}_${platform}`] = { 
            success: true, 
            message: `Successfully synced ${platform}` 
          }
        } catch (err: any) {
          console.error(`Error syncing ${platform} for ${user.username}:`, err)
          results[`${user.username}_${platform}`] = { 
            success: false, 
            message: err.message || `Failed to sync ${platform}` 
          }
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Sync job completed', 
      results 
    })
  } catch (error: any) {
    console.error('Error in sync-all cron job:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Unknown error' 
    }, { status: 500 })
  }
} 