CREATE TYPE "public"."event_status" AS ENUM('published', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('concert', 'theatre', 'sport', 'conference', 'festival', 'other');--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(100) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"city" varchar(100) NOT NULL,
	"image_url" text,
	"type" "event_type" NOT NULL,
	"status" "event_status" DEFAULT 'published' NOT NULL,
	"organizer_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_starts_at_idx" ON "events" USING btree ("starts_at");