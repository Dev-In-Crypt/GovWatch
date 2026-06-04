CREATE TABLE IF NOT EXISTS "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dao_id" uuid NOT NULL,
	"proposal_id" uuid,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"data" jsonb,
	"published_to_x" boolean DEFAULT false,
	"published_to_telegram" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_space_id" text,
	"tally_org_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"website" text,
	"chain" text,
	"governance_token" text,
	"token_contract" text,
	"treasury_usd" numeric(20, 2),
	"democracy_score" numeric(5, 2) DEFAULT '0',
	"score_updated_at" timestamp with time zone,
	"score_breakdown" jsonb,
	"total_proposals" integer DEFAULT 0,
	"total_voters" integer DEFAULT 0,
	"avg_participation_rate" numeric(5, 4) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daos_snapshot_space_id_unique" UNIQUE("snapshot_space_id"),
	CONSTRAINT "daos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "delegate_dao_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delegate_id" uuid NOT NULL,
	"dao_id" uuid NOT NULL,
	"voting_power" numeric,
	"delegators_count" integer,
	"votes_cast" integer DEFAULT 0,
	"proposals_available" integer DEFAULT 0,
	"participation_rate" numeric(5, 4),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "delegates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" text NOT NULL,
	"name" text,
	"ens_name" text,
	"avatar_url" text,
	"bio" text,
	"total_daos_active" integer DEFAULT 0,
	"total_votes_cast" integer DEFAULT 0,
	"participation_rate" numeric(5, 4),
	"avg_response_time_hours" numeric(8, 2),
	"consistency_score" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "digests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_of" timestamp with time zone NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"html" text,
	"payload" jsonb,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dao_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"source" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"author" text NOT NULL,
	"choices" jsonb NOT NULL,
	"ai_summary" text,
	"ai_impact" text,
	"ai_risk_level" text,
	"summary_generated_at" timestamp with time zone,
	"state" text NOT NULL,
	"voting_type" text,
	"start_timestamp" timestamp with time zone NOT NULL,
	"end_timestamp" timestamp with time zone NOT NULL,
	"snapshot_block" text,
	"quorum" numeric,
	"quorum_reached" boolean DEFAULT false,
	"scores" jsonb,
	"scores_total" numeric,
	"votes_count" integer DEFAULT 0,
	"has_whale_vote" boolean DEFAULT false,
	"has_last_minute_swing" boolean DEFAULT false,
	"is_controversial" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "score_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dao_id" uuid NOT NULL,
	"score" numeric(5, 2) NOT NULL,
	"breakdown" jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"email_verified" timestamp with time zone,
	"image" text,
	"plan" text DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"watched_daos" text[] DEFAULT '{}'::text[],
	"watched_delegates" text[] DEFAULT '{}'::text[],
	"alert_email" boolean DEFAULT true,
	"alert_telegram" boolean DEFAULT false,
	"telegram_chat_id" text,
	"api_key" text,
	"api_calls_this_month" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"dao_id" uuid NOT NULL,
	"voter_address" text NOT NULL,
	"choice" integer NOT NULL,
	"voting_power" numeric NOT NULL,
	"voting_power_pct" numeric(7, 4),
	"reason" text,
	"is_whale" boolean DEFAULT false,
	"is_last_minute" boolean DEFAULT false,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_dao_id_daos_id_fk" FOREIGN KEY ("dao_id") REFERENCES "public"."daos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delegate_dao_activity" ADD CONSTRAINT "delegate_dao_activity_delegate_id_delegates_id_fk" FOREIGN KEY ("delegate_id") REFERENCES "public"."delegates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delegate_dao_activity" ADD CONSTRAINT "delegate_dao_activity_dao_id_daos_id_fk" FOREIGN KEY ("dao_id") REFERENCES "public"."daos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "proposals" ADD CONSTRAINT "proposals_dao_id_daos_id_fk" FOREIGN KEY ("dao_id") REFERENCES "public"."daos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "score_history" ADD CONSTRAINT "score_history_dao_id_daos_id_fk" FOREIGN KEY ("dao_id") REFERENCES "public"."daos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "votes" ADD CONSTRAINT "votes_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "votes" ADD CONSTRAINT "votes_dao_id_daos_id_fk" FOREIGN KEY ("dao_id") REFERENCES "public"."daos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_accounts_provider" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_alerts_dao" ON "alerts" USING btree ("dao_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_alerts_type" ON "alerts" USING btree ("type","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_daos_snapshot" ON "daos" USING btree ("snapshot_space_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_daos_score" ON "daos" USING btree ("democracy_score");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_delegate_dao" ON "delegate_dao_activity" USING btree ("delegate_id","dao_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_delegates_address" ON "delegates" USING btree ("address");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_proposals_external" ON "proposals" USING btree ("dao_id","external_id","source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_proposals_state" ON "proposals" USING btree ("state","end_timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_proposals_dao" ON "proposals" USING btree ("dao_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_score_history" ON "score_history" USING btree ("dao_id","computed_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_verification_pk" ON "verification_tokens" USING btree ("identifier","token");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_votes_proposal_voter" ON "votes" USING btree ("proposal_id","voter_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_votes_proposal" ON "votes" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_votes_voter" ON "votes" USING btree ("voter_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_votes_whale" ON "votes" USING btree ("proposal_id","is_whale");