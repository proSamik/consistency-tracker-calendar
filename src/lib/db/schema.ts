import { pgTable, text, timestamp, uuid, date, integer, jsonb, primaryKey } from 'drizzle-orm/pg-core';

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