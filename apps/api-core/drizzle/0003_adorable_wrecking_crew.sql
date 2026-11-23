ALTER TABLE "events" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "location_name" varchar(100);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "location_address" varchar(200);--> statement-breakpoint
UPDATE "events" SET "description" = 'Description à compléter.', "location_name" = 'Lieu à préciser', "location_address" = 'Adresse à préciser';--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "description" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "location_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "location_address" SET NOT NULL;
