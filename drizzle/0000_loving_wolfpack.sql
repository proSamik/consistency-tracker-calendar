CREATE TABLE IF NOT EXISTS "activities" (
	"username" text NOT NULL,
	"activity_date" date NOT NULL,
	"last_synced" timestamp DEFAULT now() NOT NULL,
	"github_data" jsonb DEFAULT '{"contributions":0,"repositories":[]}'::jsonb,
	"twitter_data" jsonb DEFAULT '{"tweet_count":0,"tweet_urls":[]}'::jsonb,
	"youtube_data" jsonb DEFAULT '{"video_count":0,"video_urls":[]}'::jsonb,
	"instagram_data" jsonb DEFAULT '{"post_count":0,"post_urls":[]}'::jsonb,
	"total_activity_count" integer DEFAULT 0,
	"custom_activities" jsonb DEFAULT '[]'::jsonb,
	CONSTRAINT "activities_username_activity_date_pk" PRIMARY KEY("username","activity_date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"username" text,
	"full_name" text,
	"avatar_url" text,
	"github_username" text,
	"twitter_username" text,
	"instagram_username" text,
	"youtube_username" text,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
DO $$ BEGIN
  -- Check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'activities_username_users_username_fk'
    AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    ALTER TABLE "activities" ADD CONSTRAINT "activities_username_users_username_fk" FOREIGN KEY ("username") REFERENCES "public"."users"("username") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;