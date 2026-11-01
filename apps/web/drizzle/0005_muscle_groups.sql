ALTER TABLE "exercise" ADD COLUMN "muscle_group" text;--> statement-breakpoint
ALTER TABLE "workout" ADD COLUMN "muscle_groups" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_muscle_group" CHECK ("exercise"."muscle_group" in ('chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs'));--> statement-breakpoint
ALTER TABLE "workout" ADD CONSTRAINT "workout_muscle_groups" CHECK ("workout"."muscle_groups" <@ array['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs']::text[]);--> statement-breakpoint
-- Rattrapage (D27) : un exercice existant qui porte le nom d'une entrée du catalogue, sans tenir
-- compte de la casse, prend son groupe. Les autres restent « Non classés ».
UPDATE "exercise" SET "muscle_group" = "catalog"."grp" FROM (VALUES
  ('Développé couché', 'chest'),
  ('Développé incliné', 'chest'),
  ('Développé couché haltères', 'chest'),
  ('Développé incliné haltères', 'chest'),
  ('Écarté à la poulie', 'chest'),
  ('Pec deck', 'chest'),
  ('Dips', 'chest'),
  ('Tractions', 'back'),
  ('Tirage vertical', 'back'),
  ('Tirage horizontal', 'back'),
  ('Rowing barre', 'back'),
  ('Rowing haltère', 'back'),
  ('Rowing machine', 'back'),
  ('Soulevé de terre', 'back'),
  ('Pull-over à la poulie', 'back'),
  ('Développé militaire', 'shoulders'),
  ('Développé épaules haltères', 'shoulders'),
  ('Élévations latérales', 'shoulders'),
  ('Élévations latérales à la poulie', 'shoulders'),
  ('Oiseau', 'shoulders'),
  ('Face pull', 'shoulders'),
  ('Squat', 'legs'),
  ('Presse à cuisses', 'legs'),
  ('Fentes', 'legs'),
  ('Squat bulgare', 'legs'),
  ('Soulevé de terre jambes tendues', 'legs'),
  ('Hip thrust', 'legs'),
  ('Leg extension', 'legs'),
  ('Leg curl', 'legs'),
  ('Mollets debout', 'legs'),
  ('Curl barre', 'biceps'),
  ('Curl haltères', 'biceps'),
  ('Curl marteau', 'biceps'),
  ('Curl à la poulie', 'biceps'),
  ('Extension triceps à la poulie', 'triceps'),
  ('Barre au front', 'triceps'),
  ('Extension triceps au-dessus de la tête', 'triceps'),
  ('Crunch à la poulie', 'abs'),
  ('Relevé de jambes', 'abs'),
  ('Roue abdominale', 'abs')
) AS "catalog"("name", "grp") WHERE lower("exercise"."name") = lower("catalog"."name");