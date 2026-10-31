import { sql } from "drizzle-orm";
import { expect, it } from "vitest";
import { createTestDb, rowsOf } from "../helpers/test-db";

it("createTestDb fournit une base PostgreSQL vierge et isolée", async () => {
  const a = await createTestDb();
  const b = await createTestDb();
  await a.execute(sql`create table t (id int)`);
  const rows = await rowsOf(
    b,
    sql`select count(*)::int as n from information_schema.tables where table_name = 't'`,
  );
  expect(rows[0]).toEqual({ n: 0 });
});
