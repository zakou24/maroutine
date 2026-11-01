CREATE TABLE "body_weight" (
	"user_id" text NOT NULL,
	"measured_on" date NOT NULL,
	"weight_kg" numeric(4, 1) NOT NULL,
	CONSTRAINT "body_weight_user_id_measured_on_pk" PRIMARY KEY("user_id","measured_on"),
	CONSTRAINT "body_weight_kg" CHECK ("body_weight"."weight_kg" between 20 and 300)
);
--> statement-breakpoint
ALTER TABLE "body_weight" ADD CONSTRAINT "body_weight_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;