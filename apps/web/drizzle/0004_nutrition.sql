CREATE TABLE "food" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text,
	"source" text NOT NULL,
	"off_code" text,
	"name" text NOT NULL,
	"brand" text,
	"kcal_per_100g" numeric(5, 1) NOT NULL,
	"protein_per_100g" numeric(4, 1) NOT NULL,
	"fetched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "food_source" CHECK (("food"."source" = 'custom' and "food"."owner_id" is not null) or ("food"."source" = 'off' and "food"."owner_id" is null and "food"."off_code" is not null)),
	CONSTRAINT "food_values" CHECK ("food"."kcal_per_100g" between 0 and 900 and "food"."protein_per_100g" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "food_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"eaten_on" date NOT NULL,
	"meal" text NOT NULL,
	"food_id" uuid,
	"label" text NOT NULL,
	"quantity_g" numeric(5, 1),
	"kcal" numeric(6, 1) NOT NULL,
	"protein_g" numeric(6, 1) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "food_entry_meal" CHECK ("food_entry"."meal" in ('breakfast', 'lunch', 'dinner', 'snack')),
	CONSTRAINT "food_entry_quantity" CHECK ("food_entry"."quantity_g" is null or "food_entry"."quantity_g" > 0),
	CONSTRAINT "food_entry_values" CHECK ("food_entry"."kcal" >= 0 and "food_entry"."protein_g" >= 0)
);
--> statement-breakpoint
CREATE TABLE "nutrition_target" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"valid_from" date NOT NULL,
	"kcal" integer NOT NULL,
	"protein_g" integer NOT NULL,
	CONSTRAINT "nutrition_target_values" CHECK ("nutrition_target"."kcal" between 500 and 10000 and "nutrition_target"."protein_g" between 0 and 500)
);
--> statement-breakpoint
ALTER TABLE "food" ADD CONSTRAINT "food_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_entry" ADD CONSTRAINT "food_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_entry" ADD CONSTRAINT "food_entry_food_id_food_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."food"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_target" ADD CONSTRAINT "nutrition_target_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "food_off_code_unique" ON "food" USING btree ("off_code") WHERE "food"."source" = 'off';--> statement-breakpoint
CREATE INDEX "food_owner_idx" ON "food" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "food_entry_user_day_idx" ON "food_entry" USING btree ("user_id","eaten_on");--> statement-breakpoint
CREATE UNIQUE INDEX "nutrition_target_user_valid_from" ON "nutrition_target" USING btree ("user_id","valid_from");