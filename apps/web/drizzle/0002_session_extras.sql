ALTER TABLE "workout" ADD COLUMN "warmup_done" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workout" ADD COLUMN "cardio_minutes" integer;--> statement-breakpoint
ALTER TABLE "workout" ADD CONSTRAINT "workout_cardio_minutes" CHECK ("workout"."cardio_minutes" between 1 and 180);