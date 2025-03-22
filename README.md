# Consistency Tracker

A Next.js application that helps you track your social media consistency across different platforms.

## Features

- User authentication with Supabase
- Social media profile management
- Dashboard for tracking social media presence
- Protected routes with middleware
- Modern UI with Tailwind CSS
- Automatic database migrations with Drizzle ORM

## Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- Supabase account and project

## Setup

1. Clone the repository:```bash
git clone https://github.com/prosamik/consistency-tracker-calendar.git
cd consistency-tracker```

2. Install dependencies:
```bash
npm install
```

3. Create a Supabase project and get your credentials:
   - Go to [Supabase](https://supabase.com)
   - Create a new project
   - Get your project URL and anon key from the project settings
   - Create a service role key for server-side operations

4. Create a `.env` file in the root directory with your Supabase credentials:
```env
# Database URL for Postgres
DATABASE_URL=postgres://postgres:postgres@localhost:5432/consistency_tracker (public database url)

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# API Keys for third-party services
GITHUB_TOKEN=your-github-personal-access-token
APIFY_TOKEN=your-apify-api-token

# YouTube API Key
YOUTUBE_API_KEY=your-youtube-api-key

# Host configuration
NEXT_PUBLIC_HOST=your-public-host-url

# Cron Secret Key
CRON_SECRET=your-cron-secret-key-here

```

5. Database Setup:
   The application uses Drizzle ORM for database management. The schema is defined in `src/lib/db/schema.ts`.
   
   Available database commands:
   ```bash
   # Generate migration files based on schema changes
   npm run db:generate
   
   # Push schema changes directly to the database
   npm run db:push
   
   # Open Drizzle Studio to view and manage your database
   npm run db:studio
   
   # Run migrations (automatically runs on npm run dev)
   npm run migrate
   ```

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── lib/                   # Utility functions and configurations
│   ├── db/               # Database related code
│   │   ├── schema.ts     # Database schema definitions
│   │   ├── index.ts      # Database client setup
│   │   └── migrate.ts    # Migration script
│   └── supabase.ts       # Supabase client
├── drizzle/              # Generated migration files
└── middleware.ts         # Route protection middleware
```

## Database Schema
The application uses the following database schema:

```typescript
// src/lib/db/schema.ts
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  username: text('username'),
  full_name: text('full_name'),
  avatar_url: text('avatar_url'),
  github_username: text('github_username'),
  twitter_username: text('twitter_username'),
  instagram_username: text('instagram_username'),
  youtube_username: text('youtube_username'),
});
```

When you accidentally delete your migrations directory but the database schema still exists, the best approach is:
1. Run `npm run db:sync` to create placeholder migrations that match your database state.
2. Run `npm run db:mark-applied` to mark all migrations as applied without executing them.
3. Run `npm run db:generate` to keep your schema in sync going forward.
You can now continue development normally, as the migration state has been properly restored.

## Automated Background Sync

The application includes automated background synchronization that runs every 6 hours to keep user data up-to-date across all platforms:

- GitHub activity
- Twitter posts
- Instagram posts
- YouTube uploads

This is configured using Vercel Cron Jobs and runs completely server-side without requiring user intervention. For more details, see the [Cron Jobs documentation](docs/cron-jobs.md).

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


