/**
 * This script resets the migration state in the database
 * Use when you need to start fresh with migrations
 */
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL environment variable');
}

/**
 * Generates a simple hash for identifying migrations
 */
function generateHash(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Main function to reset migration state
 */
async function main() {
  console.log('Starting migration reset...');
  
  // Create postgres client with shorter timeout
  const client = postgres(process.env.DATABASE_URL as string, { 
    max: 1,
    idle_timeout: 10,
    connect_timeout: 30,
  });
  
  try {
    // Check if _drizzle_migrations table exists
    console.log('Checking for _drizzle_migrations table...');
    
    const checkTableQuery = await client.unsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_drizzle_migrations'
      );
    `);
    
    const tableExists = checkTableQuery[0].exists;
    
    if (tableExists) {
      // Drop the existing migrations table
      console.log('Dropping existing _drizzle_migrations table...');
      await client.unsafe(`DROP TABLE IF EXISTS "_drizzle_migrations";`);
    }
    
    // Create a new migrations table
    console.log('Creating new _drizzle_migrations table...');
    await client.unsafe(`
      CREATE TABLE "_drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at timestamp with time zone DEFAULT now()
      );
    `);
    
    // Add a single migration record
    const hash = generateHash();
    console.log('Adding initial migration record...');
    await client.unsafe(`
      INSERT INTO "_drizzle_migrations" (hash, created_at)
      VALUES ('${hash}', NOW());
    `);
    
    console.log('\nMigration state reset successfully!');
    console.log('\nNext steps:');
    console.log('1. Delete the drizzle directory: rm -rf drizzle');
    console.log('2. Run "npm run db:generate" to generate fresh migrations');
    console.log('3. Run "npm run migrate" to initialize the migration state');
    
  } catch (error) {
    console.error('Error resetting migrations:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error); 