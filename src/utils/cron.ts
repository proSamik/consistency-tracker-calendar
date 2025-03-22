/**
 * Cron utility functions for scheduled tasks
 */

/**
 * Schedule for running sync jobs once a day
 * Times are in UTC
 * 00:00
 */
export const SYNC_SCHEDULE = '0 0 * * *'

/**
 * Determines if the current time is within the allowed window to run a sync job
 * This helps prevent running the same job multiple times if the cron trigger fires late
 * @param targetHour The hour in UTC when the job should run (0)
 * @returns boolean indicating if the job should run
 */
export function isWithinSyncWindow(targetHour: number): boolean {
  const now = new Date()
  const currentHour = now.getUTCHours()
  const currentMinute = now.getUTCMinutes()
  
  // Allow running within 30 minutes of the target hour
  if (currentHour === targetHour && currentMinute < 30) {
    return true
  }
  
  return false
}

/**
 * Gets the next scheduled sync time
 * @returns Date object for the next sync time
 */
export function getNextSyncTime(): Date {
  const now = new Date()
  const currentHour = now.getUTCHours()
  
  // Calculate hours until next sync
  // Sync time is at hour 0
  let hoursUntilNextSync = 0
  
  if (currentHour < 0) {
    hoursUntilNextSync = 24 - currentHour
  } else {
    // After 00:00, the next sync is at 00:00 the next day
    hoursUntilNextSync = 24 - currentHour
  }
  
  const nextSync = new Date(now)
  nextSync.setUTCHours(now.getUTCHours() + hoursUntilNextSync)
  nextSync.setUTCMinutes(0)
  nextSync.setUTCSeconds(0)
  nextSync.setUTCMilliseconds(0)
  
  return nextSync
} 