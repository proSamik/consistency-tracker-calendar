import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL environment variable');
}

/**
 * Create a PostgreSQL client using the DATABASE_URL
 * Using Supabase connection pooler in session mode
 */
export const createDbClient = () => {
  // Create postgres client using session pooler
  const client = postgres(process.env.DATABASE_URL as string);
  
  // Create Drizzle ORM instance
  return drizzle(client);
}; 