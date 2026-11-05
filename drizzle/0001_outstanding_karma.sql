CREATE TYPE "public"."activity_type" AS ENUM('created', 'joined', 'message', 'shared_context', 'retracted_context', 'vote', 'left', 'removed', 'goal_updated', 'closed');--> statement-breakpoint
CREATE TYPE "public"."board_item_kind" AS ENUM('note', 'pin');--> statement-breakpoint
CREATE TYPE "public"."message_kind" AS ENUM('message', 'question', 'proposal', 'decision', 'system');--> statement-breakpoint
CREATE TYPE "public"."message_visibility" AS ENUM('all', 'private');--> statement-breakpoint
CREATE TYPE "public"."participant_role" AS ENUM('initiator', 'member');--> statement-breakpoint
CREATE TYPE "public"."space_status" AS ENUM('draft', 'open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."vote_choice" AS ENUM('yes', 'no', 'abstain');--> statement-breakpoint
CREATE TABLE "activity" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"actor_participant_id" text,
	"type" "activity_type" NOT NULL,
	"ref_id" text,
	"visibility" "message_visibility" DEFAULT 'all' NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_item" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"kind" "board_item_kind" NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"removed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "box_item" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"participant_id" text NOT NULL,
	"topic" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"retracted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"author_participant_id" text,
	"kind" "message_kind" DEFAULT 'message' NOT NULL,
	"reply_to" bigint,
	"visibility" "message_visibility" DEFAULT 'all' NOT NULL,
	"addressed_to" text[],
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participant" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"user_id" text NOT NULL,
	"represents" text NOT NULL,
	"role" "participant_role" DEFAULT 'member' NOT NULL,
	"harness" text,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"last_read_message_id" bigint
);
--> statement-breakpoint
CREATE TABLE "proposal_vote" (
	"proposal_message_id" bigint NOT NULL,
	"participant_id" text NOT NULL,
	"choice" "vote_choice" NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "proposal_vote_proposal_message_id_participant_id_pk" PRIMARY KEY("proposal_message_id","participant_id")
);
--> statement-breakpoint
CREATE TABLE "space" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"goal" text NOT NULL,
	"description" text,
	"deadline" timestamp,
	"status" "space_status" DEFAULT 'open' NOT NULL,
	"created_by" text NOT NULL,
	"summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "space_invite" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp,
	"max_uses" integer,
	"uses" integer DEFAULT 0 NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "space_invite_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_actor_participant_id_participant_id_fk" FOREIGN KEY ("actor_participant_id") REFERENCES "public"."participant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_item" ADD CONSTRAINT "board_item_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "box_item" ADD CONSTRAINT "box_item_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "box_item" ADD CONSTRAINT "box_item_participant_id_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_author_participant_id_participant_id_fk" FOREIGN KEY ("author_participant_id") REFERENCES "public"."participant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant" ADD CONSTRAINT "participant_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant" ADD CONSTRAINT "participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_vote" ADD CONSTRAINT "proposal_vote_proposal_message_id_message_id_fk" FOREIGN KEY ("proposal_message_id") REFERENCES "public"."message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_vote" ADD CONSTRAINT "proposal_vote_participant_id_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space" ADD CONSTRAINT "space_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_invite" ADD CONSTRAINT "space_invite_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_space_id_idx" ON "activity" USING btree ("space_id","id");--> statement-breakpoint
CREATE INDEX "board_item_space_idx" ON "board_item" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "box_item_participant_idx" ON "box_item" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "message_space_id_idx" ON "message" USING btree ("space_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "participant_space_user_idx" ON "participant" USING btree ("space_id","user_id");--> statement-breakpoint
CREATE INDEX "participant_user_idx" ON "participant" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "space_invite_space_idx" ON "space_invite" USING btree ("space_id");