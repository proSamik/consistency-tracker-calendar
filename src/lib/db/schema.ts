import { pgTable, text, timestamp, uuid, date, integer, jsonb, primaryKey, boolean } from 'drizzle-orm/pg-core';

/**
 * User table schema definition
 * Stores user profiles and credentials
 * username is unique across all users but can be null initially
 * id (UUID) is the primary key
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  username: text('username').unique(),
  full_name: text('full_name'),
  avatar_url: text('avatar_url'),
  
  // Social media credentials
  github_username: text('github_username'),
  twitter_username: text('twitter_username'),
  instagram_username: text('instagram_username'),
  youtube_username: text('youtube_username'),
});

/**
 * Activities table schema definition
 * Stores user activities across different platforms by date
 * Primary key is a composite of username and activity_date
 * Each platform data is stored as JSON to allow flexible schema
 */
export const activities = pgTable('activities', {
  // Composite primary key of username and date
  username: text('username').notNull().references(() => users.username),
  activity_date: date('activity_date').notNull(),
  
  // Last time this record was synced
  last_synced: timestamp('last_synced').defaultNow().notNull(),
  
  // Platform data stored as JSON objects
  github_data: jsonb('github_data').default({
    contributions: 0,
    repositories: []
  }),
  
  // Privacy settings for platforms
  github_private: boolean('github_private').default(false),
  twitter_private: boolean('twitter_private').default(false),
  youtube_private: boolean('youtube_private').default(false),
  instagram_private: boolean('instagram_private').default(false),
  
  twitter_data: jsonb('twitter_data').default({
    tweet_count: 0,
    tweet_urls: []
  }),
  
  youtube_data: jsonb('youtube_data').default({
    video_count: 0,
    video_urls: []
  }),
  
  instagram_data: jsonb('instagram_data').default({
    post_count: 0,
    post_urls: []
  }),
  
  // Total activity count across all platforms
  total_activity_count: integer('total_activity_count').default(0),
  
  // Additional user-defined activities
  custom_activities: jsonb('custom_activities').default([]),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.username, table.activity_date] }),
  }
});

/**
 * SyncQueue table schema definition
 * Used to manage queued sync tasks for the cron job
 * This prevents high memory usage by processing users sequentially
 */
export const syncQueue = pgTable('sync_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  
  // The user to sync
  user_id: uuid('user_id').notNull().references(() => users.id),
  
  // The platform to sync
  platform: text('platform').notNull(),
  
  // The date to sync for
  sync_date: date('sync_date').notNull(),
  
  // Status of the sync job
  status: text('status').notNull().default('pending'), // pending, processing, completed, failed
  
  // When processing started
  started_at: timestamp('started_at'),
  
  // When processing completed
  completed_at: timestamp('completed_at'),
  
  // Error message if failed
  error: text('error'),
  
  // Number of retries
  retry_count: integer('retry_count').default(0),
  
  // Priority (lower number = higher priority)
  priority: integer('priority').default(10),
}); 