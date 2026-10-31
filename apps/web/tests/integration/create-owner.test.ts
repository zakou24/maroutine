import { sql } from "drizzle-orm";
import { beforeEach, expect, it } from "vitest";
import type { AppDatabase } from "@/db/client";
import { createOwner } from "@/server/create-owner";
import { createTestDb, rowsOf } from "../helpers/test-db";

let db: AppDatabase;
beforeEach(async () => {
  db = await createTestDb();
});

it("crée le propriétaire avec un email nettoyé", async () => {
  const result = await createOwner(db, {
    email: " Zak@Mail.com",
    password: "correct-horse-battery",
  });
  expect(result).toEqual({ ok: true });
  const rows = await rowsOf<{ email: string; is_demo: boolean }>(
    db,
    sql`select email, is_demo from "user"`,
  );
  expect(rows).toEqual([{ email: "zak@mail.com", is_demo: false }]);
});

it("refuse un second propriétaire", async () => {
  await createOwner(db, { email: "zak@mail.com", password: "correct-horse-battery" });
  const result = await createOwner(db, {
    email: "autre@mail.com",
    password: "correct-horse-battery",
  });
  expect(result).toEqual({ ok: false, reason: "Un propriétaire existe déjà." });
});

it("refuse un mot de passe de moins de 12 caractères", async () => {
  const result = await createOwner(db, { email: "zak@mail.com", password: "court" });
  expect(result).toEqual({
    ok: false,
    reason: "Le mot de passe doit faire entre 12 et 128 caractères.",
  });
});

it("refuse un email invalide", async () => {
  const result = await createOwner(db, { email: "zak", password: "correct-horse-battery" });
  expect(result).toEqual({ ok: false, reason: "Email invalide." });
});

it("ne laisse aucune session après la création du propriétaire", async () => {
  await createOwner(db, { email: "zak@mail.com", password: "correct-horse-battery" });
  const rows = await rowsOf<{ n: number }>(db, sql`select count(*)::int as n from "session"`);
  expect(rows[0]?.n).toBe(0);
});
