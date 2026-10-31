CREATE TABLE "exercise" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"equipment" text NOT NULL,
	"rep_min" integer NOT NULL,
	"rep_max" integer NOT NULL,
	"increment_kg" numeric(5, 2) NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercise_name_length" CHECK (char_length("exercise"."name") between 1 and 60),
	CONSTRAINT "exercise_equipment" CHECK ("exercise"."equipment" in ('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other')),
	CONSTRAINT "exercise_rep_range" CHECK ("exercise"."rep_min" >= 1 and "exercise"."rep_max" >= "exercise"."rep_min" and "exercise"."rep_max" <= 50),
	CONSTRAINT "exercise_increment" CHECK ("exercise"."increment_kg" > 0 and "exercise"."increment_kg" <= 20)
);
--> statement-breakpoint
CREATE TABLE "workout" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"performed_on" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_note_length" CHECK (char_length("workout"."note") <= 500)
);
--> statement-breakpoint
CREATE TABLE "workout_exercise" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_set" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_exercise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"weight_kg" numeric(6, 2) NOT NULL,
	"reps" integer NOT NULL,
	"is_warmup" boolean DEFAULT false NOT NULL,
	CONSTRAINT "workout_set_weight" CHECK ("workout_set"."weight_kg" >= 0 and "workout_set"."weight_kg" <= 999.75),
	CONSTRAINT "workout_set_reps" CHECK ("workout_set"."reps" between 0 and 100)
);
--> statement-breakpoint
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout" ADD CONSTRAINT "workout_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_workout_id_workout_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workout"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_exercise_id_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_set" ADD CONSTRAINT "workout_set_workout_exercise_id_workout_exercise_id_fk" FOREIGN KEY ("workout_exercise_id") REFERENCES "public"."workout_exercise"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_user_name_unique" ON "exercise" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE INDEX "workout_user_performed_on_idx" ON "workout" USING btree ("user_id","performed_on");--> statement-breakpoint
CREATE INDEX "workout_exercise_exercise_idx" ON "workout_exercise" USING btree ("exercise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_exercise_workout_exercise_unique" ON "workout_exercise" USING btree ("workout_id","exercise_id");--> statement-breakpoint
CREATE INDEX "workout_set_workout_exercise_idx" ON "workout_set" USING btree ("workout_exercise_id");