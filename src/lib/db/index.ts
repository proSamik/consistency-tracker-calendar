import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL environment variable');
}

// Connection pool settings
const CONNECTION_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Creates a database client with connection retry logic
 * Handles timeouts and connection errors gracefully
 */
export function createDbClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }

  // Create postgres client with better timeout handling
  const client = postgres(connectionString, {
    max: 10, // Connection pool size
    idle_timeout: 20, // Idle connection timeout in seconds
    connect_timeout: CONNECTION_TIMEOUT,
    prepare: false, // For better timeout handling
  });

  // Create drizzle ORM client
  return drizzle(client, { schema });
}

/**
 * Execute a database query with retry logic
 * Will attempt to reconnect on timeout errors
 */
export async function executeWithRetry<T>(
  queryFn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  try {
    return await queryFn();
  } catch (error: unknown) {
    const dbError = error as { code?: string };
    if ((dbError.code === 'CONNECT_TIMEOUT' || dbError.code === 'CONNECTION_CLOSED') && retries > 0) {
      console.log(`Database connection error. Retrying (${retries} attempts left)...`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      
      // Retry the query
      return executeWithRetry(queryFn, retries - 1);
    }
    throw error;
  }
} 