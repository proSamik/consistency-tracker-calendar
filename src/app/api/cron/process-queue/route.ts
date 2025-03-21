import { NextResponse } from 'next/server'
import { processTasks } from '@/lib/queue'

/**
 * Background job that processes tasks from the sync queue
 * This endpoint should be called frequently (e.g. every minute)
 * It processes a batch of tasks from the queue
 * 
 * To test this route:
 * 1. Set CRON_SECRET in your .env file (use: openssl rand -base64 32)
 * 2. Make a POST request to /api/cron/process-queue with the Authorization header:
 *    curl -X POST http://localhost:3000/api/cron/process-queue \
 *      -H "Content-Type: application/json" \
 *      -H "Authorization: Bearer YOUR_CRON_SECRET" \
 *      -d '{"limit": 5}'
 */
export async function POST(request: Request) {
  try {
    console.log('Starting queue processor job')
    
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
      console.error('Unauthorized attempt to access queue processor')
      return NextResponse.json(
        { error: 'Unauthorized. Valid cron secret required.' }, 
        { status: 401 }
      )
    }
    
    // Get request data (optional limit parameter)
    const requestData = await request.json().catch(() => ({}))
    const limit = requestData.limit || 5 // Default to processing 5 tasks at a time
    
    // Process tasks from the queue
    const processedCount = await processTasks(limit)
    console.log(`Processed ${processedCount} tasks from the queue`)
    
    return NextResponse.json({
      success: true,
      message: 'Queue processor completed',
      processed: processedCount
    })
  } catch (error: any) {
    console.error('Error in queue processor job:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Unknown error' 
    }, { status: 500 })
  }
} 