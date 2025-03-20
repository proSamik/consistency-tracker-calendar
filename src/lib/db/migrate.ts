import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL environment variable');
}

const MIGRATIONS_FOLDER = './drizzle';

/**
 * Runs database migrations using Drizzle
 */
async function main() {
  try {
    // Check if migrations folder exists
    const journalPath = path.join(process.cwd(), MIGRATIONS_FOLDER, 'meta', '_journal.json');
    const migrationsFolderExists = fs.existsSync(path.join(process.cwd(), MIGRATIONS_FOLDER));
    const journalExists = fs.existsSync(journalPath);
    
    if (!migrationsFolderExists || !journalExists) {
      console.log('No migrations found. Run "npx drizzle-kit generate" first.');
      process.exit(0);
    }
    
    // Create postgres client using session pooler
    const client = postgres(process.env.DATABASE_URL as string, { 
      max: 1
    });
    
    // Create Drizzle instance
    const db = drizzle(client);
    
    // Run migrations
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    
    console.log('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

main(); 