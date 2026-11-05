ALTER TYPE "public"."master_wake_kind" ADD VALUE 'check';--> statement-breakpoint
ALTER TABLE "master_session" ADD COLUMN "paused_at" timestamp;--> statement-breakpoint
ALTER TABLE "master_session" ADD COLUMN "budget_interaction_id" text;--> statement-breakpoint
ALTER TABLE "master_wake" ADD COLUMN "interval_minutes" integer;--> statement-breakpoint
ALTER TABLE "master_wake" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "space_plan" ADD COLUMN "criteria" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "space_plan" ADD COLUMN "final_proposal_id" bigint;--> statement-breakpoint
CREATE UNIQUE INDEX "master_wake_active_check_idx" ON "master_wake" USING btree ("space_id") WHERE "master_wake"."interval_minutes" is not null and "master_wake"."done_at" is null;