ALTER TYPE "public"."master_wake_kind" ADD VALUE IF NOT EXISTS 'reminder';--> statement-breakpoint
CREATE TABLE "master_message_meta" (
	"message_id" bigint PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"subproblem_id" text,
	"withdrawn_at" timestamp,
	"withdraw_reason" text
);
--> statement-breakpoint
ALTER TABLE "master_message_meta" ADD CONSTRAINT "master_message_meta_message_id_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_message_meta" ADD CONSTRAINT "master_message_meta_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "master_message_meta_space_idx" ON "master_message_meta" USING btree ("space_id");