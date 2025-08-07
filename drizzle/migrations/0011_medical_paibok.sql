ALTER TABLE "organization" DROP CONSTRAINT "organization_owner_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "organization_member" DROP CONSTRAINT "organization_member_invited_by_user_id_fk";
--> statement-breakpoint
DROP INDEX "organization_owner_idx";--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "metadata" json DEFAULT '{}'::json;--> statement-breakpoint
ALTER TABLE "organization_member" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_member" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "active_organization_id" text;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "organizationId" text;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "seats" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "pricePerSeat" integer;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_user_org_idx" ON "subscription" USING btree ("userId","organizationId");--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "website";--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "owner_id";--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "settings";--> statement-breakpoint
ALTER TABLE "organization_member" DROP COLUMN "joined_at";--> statement-breakpoint
ALTER TABLE "organization_member" DROP COLUMN "invited_by";