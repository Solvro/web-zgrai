DROP INDEX "master_wake_pending_debounce_idx";--> statement-breakpoint
ALTER TABLE "master_session" ADD COLUMN "last_activity_id" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "master_wake_pending_debounce_idx" ON "master_wake" USING btree ("space_id") WHERE "master_wake"."kind" = 'debounce' and "master_wake"."claimed_at" is null and "master_wake"."done_at" is null;