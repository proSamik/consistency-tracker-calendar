/**
 * This script marks a migration as applied without running it
 * Useful for migrations that you've applied manually
 */
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL environment variable');
}

/**
 * Creates a hash for a migration file
 */
function generateMigrationHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Main function to mark a migration as applied
 */
async function main() {
  try {
    console.log('Starting migration marking...');
    
    // Create postgres client with shorter timeout
    const client = postgres(process.env.DATABASE_URL as string, { 
      max: 1,
      connect_timeout: 30
    });
    
    try {
      // Find all SQL files in the migrations directory
      const migrationsDir = path.join(process.cwd(), 'drizzle');
      const migrationFiles = fs.existsSync(migrationsDir) ? 
        fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')) : 
        [];
      
      if (migrationFiles.length === 0) {
        console.log('No migration files found.');
        process.exit(0);
      }
      
      console.log(`Found ${migrationFiles.length} migration files.`);
      
      // Get existing migrations from the database
      const existingMigrations = await client.unsafe(`
        SELECT hash FROM "_drizzle_migrations" ORDER BY id
      `);
      
      const existingHashes = existingMigrations.map((m: any) => m.hash);
      
      // Process each migration file
      for (const file of migrationFiles) {
        const filePath = path.join(migrationsDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        
        // Generate a hash of the file content
        const hash = generateMigrationHash(fileContent);
        
        // Skip if this migration has already been applied
        if (existingHashes.includes(hash)) {
          console.log(`Migration ${file} already marked as applied, skipping.`);
          continue;
        }
        
        // Mark the migration as applied
        console.log(`Marking migration as applied: ${file}`);
        await client.unsafe(`
          INSERT INTO "_drizzle_migrations" (hash, created_at)
          VALUES ('${hash}', NOW());
        `);
        
        console.log(`Successfully marked migration: ${file}`);
      }
      
      console.log('Migration marking completed successfully');
    } finally {
      // Always close the client
      await client.end();
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error marking migrations:', error);
    process.exit(1);
  }
}

main(); 