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
 * Runs database migrations using Drizzle
 * Handles the case of existing tables gracefully
 */
async function main() {
  try {
    // Create postgres client using session pooler
    const client = postgres(process.env.DATABASE_URL as string, { 
      max: 1,
      connect_timeout: 30
    });
    
    try {
      // Check for existing _drizzle_migrations table
      const drizzleTableExists = await client.unsafe(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '_drizzle_migrations'
        );
      `).then(res => res[0].exists);
      
      // If the table doesn't exist, we'll create it
      if (!drizzleTableExists) {
        console.log('Creating _drizzle_migrations table...');
        await client.unsafe(`
          CREATE TABLE IF NOT EXISTS "_drizzle_migrations" (
            id SERIAL PRIMARY KEY,
            hash text NOT NULL,
            created_at timestamp with time zone DEFAULT now()
          );
        `);
      }
      
      // Find all SQL files in the migrations directory
      const migrationsDir = path.join(process.cwd(), 'drizzle');
      const migrationFiles = fs.existsSync(migrationsDir) ? 
        fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')) : 
        [];
      
      if (migrationFiles.length > 0) {
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
          const hash = crypto.createHash('sha256').update(fileContent).digest('hex');
          
          // Skip if this migration has already been applied
          if (existingHashes.includes(hash)) {
            console.log(`Migration ${file} already applied, skipping.`);
            continue;
          }
          
          // Apply the migration
          console.log(`Applying migration: ${file}`);
          try {
            // Use a transaction to apply the migration
            await client.unsafe(`BEGIN;`);
            await client.unsafe(fileContent);
            
            // Record the migration
            await client.unsafe(`
              INSERT INTO "_drizzle_migrations" (hash, created_at)
              VALUES ('${hash}', NOW());
            `);
            
            await client.unsafe(`COMMIT;`);
            console.log(`Successfully applied migration: ${file}`);
          } catch (err) {
            await client.unsafe(`ROLLBACK;`);
            console.log(`Error applying migration ${file}. Rolling back.`);
            throw err;
          }
        }
      } else {
        console.log('No migration files found.');
      }
      
      console.log('Migrations completed successfully');
    } finally {
      // Always close the client
      await client.end();
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

main(); 