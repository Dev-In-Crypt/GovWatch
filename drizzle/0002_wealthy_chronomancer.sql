ALTER TABLE "delegates" ADD COLUMN "karma_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "delegates" ADD COLUMN "karma_rank" integer;--> statement-breakpoint
ALTER TABLE "delegates" ADD COLUMN "karma_url" text;--> statement-breakpoint
ALTER TABLE "delegates" ADD COLUMN "karma_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "embedding" jsonb;