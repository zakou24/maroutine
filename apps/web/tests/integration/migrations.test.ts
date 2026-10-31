import { sql } from "drizzle-orm";
import { expect, it } from "vitest";
import { createTestDb, rowsOf } from "../helpers/test-db";

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
