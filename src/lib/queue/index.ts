/**
 * Queue management functionality for handling sync jobs
 * Prevents high memory usage by processing sync tasks sequentially
 */
import { and, asc, eq, sql } from 'drizzle-orm';
import { createDbClient, executeWithRetry } from '../db';
import { syncQueue, users } from '../db/schema';
import { format } from 'date-fns';

/**
 * Add sync tasks to the queue for a specific user
 * @param userId User ID to sync
 * @param platforms Array of platforms to sync
 * @param date Date to sync for (defaults to today)
 * @param priority Priority of the task (lower = higher priority)
 */
export async function enqueueUserSync(
  userId: string,
  platforms: string[],
  date: Date = new Date(),
  priority: number = 10
) {
  const db = createDbClient();
  const formattedDate = format(date, 'yyyy-MM-dd');
  
  // Create queue entries for each platform
  for (const platform of platforms) {
    await executeWithRetry(async () => {
      return db.insert(syncQueue).values({
        user_id: userId,
        platform,
        sync_date: formattedDate,
        status: 'pending',
        priority,
      });
    });
  }
}

/**
 * Add sync tasks to the queue for all users
 * @param platforms Array of platforms to sync
 * @param date Date to sync for (defaults to today)
 * @param priority Priority of the task (lower = higher priority)
 */
export async function enqueueAllUsersSync(
  platforms: string[],
  date: Date = new Date(),
  priority: number = 10
) {
  const db = createDbClient();
  
  // Get all users
  const allUsers = await executeWithRetry(async () => {
    return db.select({ id: users.id }).from(users);
  });
  
  // Enqueue tasks for each user
  for (const user of allUsers) {
    await enqueueUserSync(user.id, platforms, date, priority);
  }
  
  return allUsers.length;
}

/**
 * Get the next pending task from the queue
 * @returns The next pending task or null if none found
 */
export async function getNextPendingTask() {
  const db = createDbClient();
  
  // Find and claim the next task with a transaction
  return await executeWithRetry(async () => {
    // Start a transaction
    await db.execute(sql`BEGIN`);
    
    try {
      // Get the next pending task with the highest priority (lowest number)
      const tasks = await db
        .select()
        .from(syncQueue)
        .where(eq(syncQueue.status, 'pending'))
        .orderBy(asc(syncQueue.priority), asc(syncQueue.created_at))
        .limit(1);
      
      if (tasks.length === 0) {
        // No pending tasks found
        await db.execute(sql`COMMIT`);
        return null;
      }
      
      const task = tasks[0];
      
      // Mark it as processing
      await db
        .update(syncQueue)
        .set({
          status: 'processing',
          started_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(syncQueue.id, task.id));
      
      // Commit the transaction
      await db.execute(sql`COMMIT`);
      
      return task;
    } catch (error) {
      // Rollback on error
      await db.execute(sql`ROLLBACK`);
      throw error;
    }
  });
}

/**
 * Update task status
 * @param taskId Task ID to update
 * @param status New status (completed, failed)
 * @param errorMessage Optional error message for failed tasks
 */
export async function updateTaskStatus(
  taskId: string,
  status: 'completed' | 'failed',
  errorMessage?: string
) {
  const db = createDbClient();
  
  const updateData: any = {
    status,
    updated_at: new Date(),
  };
  
  if (status === 'completed') {
    updateData.completed_at = new Date();
  } else if (status === 'failed') {
    updateData.error = errorMessage || 'Unknown error';
    // Increment retry count
    updateData.retry_count = sql`${syncQueue.retry_count} + 1`;
  }
  
  await executeWithRetry(async () => {
    return db
      .update(syncQueue)
      .set(updateData)
      .where(eq(syncQueue.id, taskId));
  });
}

/**
 * Process the next task in the queue
 * @returns The processed task or null if no task was found
 */
export async function processNextTask() {
  // Get the next task
  const task = await getNextPendingTask();
  
  if (!task) {
    return null;
  }
  
  try {
    // Call the appropriate API endpoint based on the platform
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    let endpoint = '/api/sync/apify';
    let body: any = { date: task.sync_date };
    
    if (task.platform === 'github') {
      endpoint = '/api/sync/github';
    } else if (task.platform === 'youtube') {
      endpoint = '/api/sync/youtube';
    } else {
      // For twitter and instagram, use apify endpoint
      body.platform = task.platform;
    }
    
    // Add user ID to the body
    body.userId = task.user_id;
    
    // Get CRON_SECRET for authorization
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      throw new Error('CRON_SECRET is not configured');
    }
    
    // Call the API endpoint
    const response = await fetch(new URL(endpoint, baseUrl).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-timezone-offset': '0', // Default to UTC for background jobs
        'Authorization': `Bearer ${cronSecret}`
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
    
    // Mark task as completed
    await updateTaskStatus(task.id, 'completed');
    
    return task;
  } catch (error: any) {
    console.error(`Error processing task ${task.id}:`, error);
    
    // Mark task as failed
    await updateTaskStatus(task.id, 'failed', error.message);
    
    // If retry limit not reached, requeue with lower priority
    if ((task.retry_count ?? 0) < 3) {
      await executeWithRetry(async () => {
        const db = createDbClient();
        return db.update(syncQueue)
          .set({
            status: 'pending',
            priority: (task.priority ?? 10) + 1, // Lower priority on retry
            updated_at: new Date(),
          })
          .where(eq(syncQueue.id, task.id));
      });
    }
    
    return task;
  }
}

/**
 * Process multiple tasks from the queue (up to a limit)
 * @param limit Maximum number of tasks to process
 * @returns Number of tasks processed
 */
export async function processTasks(limit: number = 10) {
  let processed = 0;
  
  for (let i = 0; i < limit; i++) {
    const task = await processNextTask();
    if (!task) {
      break; // No more tasks to process
    }
    processed++;
  }
  
  return processed;
}

/**
 * Clean up completed or failed tasks older than the specified days
 * @param olderThanDays Days to keep completed/failed tasks for (default 7)
 * @returns Number of tasks cleaned up
 */
export async function cleanupOldTasks(olderThanDays: number = 7) {
  const db = createDbClient();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  // Delete old completed or failed tasks
  const result = await executeWithRetry(async () => {
    return db.delete(syncQueue)
      .where(
        and(
          sql`${syncQueue.status} IN ('completed', 'failed')`,
          sql`${syncQueue.updated_at} < ${cutoffDate.toISOString()}`
        )
      );
  });
  
  return result.count;
} 