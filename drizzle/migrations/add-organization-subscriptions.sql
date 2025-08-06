ALTER TABLE "subscription" 
ADD COLUMN "organizationId" text REFERENCES "organization"("id"),
ADD COLUMN "seats" integer DEFAULT 1,
ADD COLUMN "pricePerSeat" integer;

CREATE INDEX IF NOT EXISTS "subscription_user_org_idx" ON "subscription" ("userId", "organizationId");

ALTER TABLE "extreme_search_usage" 
ADD COLUMN IF NOT EXISTS "organizationId" text;

ALTER TABLE "message_usage" 
ADD COLUMN IF NOT EXISTS "organizationId" text;

ALTER TABLE "custom_instructions" 
ADD COLUMN IF NOT EXISTS "organizationId" text;

ALTER TABLE "chat" 
ADD COLUMN IF NOT EXISTS "organizationId" text;

ALTER TABLE "file_folder" 
ADD COLUMN IF NOT EXISTS "organizationId" text;

ALTER TABLE "file_library" 
ADD COLUMN IF NOT EXISTS "organizationId" text;

ALTER TABLE "tasks" 
ADD COLUMN IF NOT EXISTS "organizationId" text;

CREATE INDEX IF NOT EXISTS "chat_user_org_idx" ON "chat" ("userId", "organizationId");
CREATE INDEX IF NOT EXISTS "extreme_search_usage_user_org_idx" ON "extreme_search_usage" ("userId", "organizationId");
CREATE INDEX IF NOT EXISTS "message_usage_user_org_idx" ON "message_usage" ("userId", "organizationId");
CREATE INDEX IF NOT EXISTS "custom_instructions_user_org_idx" ON "custom_instructions" ("userId", "organizationId");
CREATE INDEX IF NOT EXISTS "file_folder_user_org_idx" ON "file_folder" ("userId", "organizationId");
CREATE INDEX IF NOT EXISTS "file_library_user_org_idx" ON "file_library" ("userId", "organizationId");
CREATE INDEX IF NOT EXISTS "tasks_user_org_idx" ON "tasks" ("userId", "organizationId");