CREATE TABLE "users" (
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
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
