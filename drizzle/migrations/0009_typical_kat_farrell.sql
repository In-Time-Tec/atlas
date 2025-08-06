CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text,
	"title" text NOT NULL,
	"prompt" text NOT NULL,
	"frequency" text NOT NULL,
	"cron_schedule" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"next_run_at" timestamp NOT NULL,
	"qstash_schedule_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"last_run_at" timestamp,
	"last_run_chat_id" text,
	"run_history" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "custom_instructions" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "extreme_search_usage" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "file_folder" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "file_library" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "message_usage" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_user_org_idx" ON "tasks" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "chat_user_org_idx" ON "chat" USING btree ("userId","organization_id");--> statement-breakpoint
CREATE INDEX "custom_instructions_user_org_idx" ON "custom_instructions" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "extreme_search_usage_user_org_idx" ON "extreme_search_usage" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "file_folder_user_org_idx" ON "file_folder" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "file_library_user_org_idx" ON "file_library" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "message_usage_user_org_idx" ON "message_usage" USING btree ("user_id","organization_id");