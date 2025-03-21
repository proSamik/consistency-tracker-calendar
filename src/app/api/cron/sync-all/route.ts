import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { enqueueAllUsersSync, processTasks, cleanupOldTasks } from '@/lib/queue'

/**
 * Background job that syncs all platforms
 * This endpoint is called by the cron job every 6 hours
 * It can also be protected with a secret key
 * 
 * To test this route:
 * 1. Set CRON_SECRET in your .env file (use: openssl rand -base64 32)
 * 2. Make a POST request to /api/cron/sync-all with the Authorization header:
 *    curl -X POST http://localhost:3000/api/cron/sync-all \
 *      -H "Content-Type: application/json" \
 *      -H "Authorization: Bearer YOUR_CRON_SECRET" \
 *      -d "{}"
 */
export async function POST(request: Request) {
  try {
    console.log('Starting cron job: sync-all platforms')
    
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
      console.error('Unauthorized attempt to access cron job')
      return NextResponse.json(
        { error: 'Unauthorized. Valid cron secret required.' }, 
        { status: 401 }
      )
    }

    // Get the current date
    const today = new Date()
    
    // Define all platforms to sync
    const platformsToSync = ['github', 'twitter', 'instagram', 'youtube']
    
    // Clean up old tasks first (tasks completed/failed more than 7 days ago)
    const cleanedTasks = await cleanupOldTasks(7)
    console.log(`Cleaned up ${cleanedTasks} old tasks`)
    
    // Add tasks to the queue
    try {
      const userCount = await enqueueAllUsersSync(platformsToSync, today)
      console.log(`Added sync tasks for ${userCount} users to the queue`)
    } catch (error) {
      console.error('Error adding tasks to queue:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to add tasks to queue' 
      }, { status: 500 })
    }
    
    // Process a batch of tasks immediately (up to 10)
    let processedCount = 0
    try {
      processedCount = await processTasks(10)
      console.log(`Processed ${processedCount} tasks from the queue`)
    } catch (error) {
      console.error('Error processing tasks:', error)
      // We continue even if some tasks fail
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Sync job queued successfully', 
      stats: {
        tasks_created: platformsToSync.length,
        tasks_processed: processedCount,
        tasks_cleaned: cleanedTasks
      }
    })
  } catch (error: any) {
    console.error('Error in sync-all cron job:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Unknown error' 
    }, { status: 500 })
  }
} 