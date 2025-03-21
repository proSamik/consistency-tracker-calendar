# Queue System for Sync Jobs

This document explains the queue system implementation for handling platform synchronization jobs.

## Overview

The consistency tracker application needs to sync data from multiple platforms (GitHub, YouTube, Twitter, Instagram) for all users. Running these sync operations concurrently for many users can lead to high memory usage and potential rate limiting from the respective APIs.

To solve this problem, we've implemented a queue system that:

1. Splits the work into small, manageable tasks
2. Processes these tasks sequentially
3. Provides retry mechanisms for failed tasks
4. Allows tracking of job status

## Database Schema

### Sync Queue Table

The queue is managed through a `sync_queue` table with the following structure:

- `id`: Unique identifier for the task (UUID)
- `created_at`: When the task was created
- `updated_at`: When the task was last updated
- `user_id`: The user whose data needs to be synced
- `platform`: Which platform to sync ('github', 'youtube', 'twitter', 'instagram')
- `sync_date`: The date to sync data for
- `status`: Current status of the task ('pending', 'processing', 'completed', 'failed')
- `started_at`: When processing of the task began
- `completed_at`: When processing of the task finished
- `error`: Error message if the task failed
- `retry_count`: Number of retry attempts for failed tasks
- `priority`: Task priority (lower number = higher priority)

### Activities Table 

The activities table has been updated to include privacy settings for each platform:

- `github_private`: Whether GitHub data should be private (boolean)
- `twitter_private`: Whether Twitter data should be private (boolean)
- `youtube_private`: Whether YouTube data should be private (boolean)
- `instagram_private`: Whether Instagram data should be private (boolean)

These settings allow users to control the visibility of their activity data for each platform independently.

## Queue Operations

The queue system provides several operations:

### Adding Tasks to Queue

- `enqueueUserSync`: Add sync tasks for a specific user
- `enqueueAllUsersSync`: Add sync tasks for all users in the system

### Processing Tasks

- `getNextPendingTask`: Get the next task to process (using transactions to prevent race conditions)
- `processNextTask`: Process a single task from the queue
- `processTasks`: Process multiple tasks from the queue (up to a limit)

### Updating Task Status

- `updateTaskStatus`: Update the status of a task (completed or failed)

### Maintenance

- `cleanupOldTasks`: Remove old completed or failed tasks

## How It Works

1. The main cron job at `/api/cron/sync-all` runs every 6 hours
2. It adds tasks to the queue for all users and platforms
3. The queue processor job at `/api/cron/process-queue` runs frequently (e.g., every minute)
4. The processor takes a few tasks at a time and processes them
5. If a task fails, it's marked for retry with decreased priority
6. Old tasks are automatically cleaned up after 7 days

## Benefits

- **Reduced Memory Usage**: Only a few tasks run at a time
- **Better Error Handling**: Failed tasks are retried automatically
- **Rate Limiting Protection**: Tasks are spaced out to prevent API rate limiting
- **Scalability**: The system can handle many users without overloading
- **Monitoring**: Task status provides visibility into the sync process

## Testing the Queue System

To test the queue system:

1. Set the `CRON_SECRET` in your `.env` file (use `openssl rand -base64 32` to generate a secure secret)
2. Add tasks to the queue:
   ```
   curl -X POST http://localhost:3000/api/cron/sync-all \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     -d "{}"
   ```
3. Process tasks from the queue:
   ```
   curl -X POST http://localhost:3000/api/cron/process-queue \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     -d '{"limit": 5}'
   ```

## Implementation Notes

- The queue uses database transactions to prevent race conditions when claiming tasks
- Priority system ensures important tasks are processed first
- Failed tasks are retried up to 3 times with decreasing priority
- Monitoring is available through the task status and logging 