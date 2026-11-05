CREATE TYPE "public"."master_wake_kind" AS ENUM('debounce', 'deadline');--> statement-breakpoint
CREATE TABLE "master_session" (
	"space_id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"last_message_id" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	CONSTRAINT "master_session_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "master_wake" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"kind" "master_wake_kind" NOT NULL,
	"due_at" timestamp NOT NULL,
	"ref_message_id" bigint,
	"claimed_at" timestamp,
	"done_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "space_plan" (
	"space_id" text PRIMARY KEY NOT NULL,
	"subproblems" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"constraints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "master_session" ADD CONSTRAINT "master_session_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_wake" ADD CONSTRAINT "master_wake_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_plan" ADD CONSTRAINT "space_plan_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "master_wake_due_idx" ON "master_wake" USING btree ("done_at","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "master_wake_pending_debounce_idx" ON "master_wake" USING btree ("space_id") WHERE "master_wake"."kind" = 'debounce' and "master_wake"."done_at" is null;