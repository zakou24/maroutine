import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { EXERCISE_CATALOG } from "@maroutine/core";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { expect, it } from "vitest";
import type { AppDatabase } from "@/db/client";
import * as schema from "@/db/schema";
import { createTestDb, rowsOf } from "../helpers/test-db";

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));
const MUSCLE_MIGRATION = "0005_muscle_groups";

it("les migrations créent les tables d'authentification", async () => {
  const db = await createTestDb();
  const rows = await rowsOf<{ table_name: string }>(
    db,
    sql`select table_name from information_schema.tables where table_schema = 'public'`,
  );
  const tables = rows.map((r) => r.table_name);
  expect(tables).toEqual(expect.arrayContaining(["user", "session", "account", "verification"]));
  expect(tables.some((t) => /rate.?limit/i.test(t))).toBe(true);
});

// Dossier de migrations arrêté juste avant `tag` : pour écrire des données « d'avant ».
function migrationsBefore(tag: string): string {
  const dir = mkdtempSync(join(tmpdir(), "maroutine-migrations-"));
  cpSync(migrationsFolder, dir, { recursive: true });
  const journalPath = join(dir, "meta/_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as { entries: { tag: string }[] };
  const index = journal.entries.findIndex((e) => e.tag === tag);
  journal.entries = journal.entries.slice(0, index);
  writeFileSync(journalPath, JSON.stringify(journal));
  return dir;
}

it("la migration 0005 classe les exercices existants au nom du catalogue, et eux seuls (D27)", async () => {
  const pglite = drizzle({ client: new PGlite(), schema });
  const db = pglite as unknown as AppDatabase;
  await migrate(pglite, { migrationsFolder: migrationsBefore(MUSCLE_MIGRATION) });
  await db.execute(sql`insert into "user" (id, name, email) values ('u', 'u', 'u@test.local')`);
  await db.execute(sql`insert into exercise (user_id, name, equipment, rep_min, rep_max, increment_kg)
    values ('u', 'squat', 'barbell', 6, 10, 2.5), ('u', 'Curl barre', 'barbell', 6, 10, 2.5),
           ('u', 'Curl barre EZ', 'barbell', 6, 10, 2.5), ('u', 'Barre au front', 'barbell', 6, 10, 2.5)`);
  await db.execute(sql`insert into workout (user_id, performed_on) values ('u', '2026-10-30')`);

  await migrate(pglite, { migrationsFolder });

  const exercises = await rowsOf<{ name: string; muscle_group: string | null }>(
    db,
    sql`select name, muscle_group from exercise order by name`,
  );
  expect(exercises).toEqual([
    { name: "Barre au front", muscle_group: "triceps" },
    { name: "Curl barre", muscle_group: "biceps" },
    { name: "Curl barre EZ", muscle_group: null },
    { name: "squat", muscle_group: "legs" },
  ]);
  const workouts = await rowsOf<{ muscle_groups: string[] }>(
    db,
    sql`select muscle_groups from workout`,
  );
  expect(workouts).toEqual([{ muscle_groups: [] }]);
});

it("le rattrapage de la migration 0005 reprend exactement le catalogue", () => {
  const text = readFileSync(join(migrationsFolder, `${MUSCLE_MIGRATION}.sql`), "utf8");
  const pairs = [...text.matchAll(/\('((?:[^']|'')+)', '(\w+)'\)/g)].map((m) => [
    m[1]!.replace(/''/g, "'"),
    m[2],
  ]);
  expect(pairs).toEqual(EXERCISE_CATALOG.map((e) => [e.name, e.group]));
});
