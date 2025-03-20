import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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