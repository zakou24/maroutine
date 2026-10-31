import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppDatabase } from "@/db/client";
import { createAuth, sessionInfoFrom } from "@/server/auth";
import { createTestDb, rowsOf } from "../helpers/test-db";

const ORIGIN = "http://localhost:3000";
const OWNER = { email: "zak@mail.com", password: "correct-horse-battery", name: "Propriétaire" };

function post(path: string, body: unknown, ip = "203.0.113.7") {
  return new Request(`${ORIGIN}/api/auth${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

async function countUsers(db: AppDatabase) {
  const rows = await rowsOf<{ n: number }>(db, sql`select count(*)::int as n from "user"`);
  return rows[0]?.n;
}

describe("authentification", () => {
  let db: AppDatabase;

  beforeEach(async () => {
    db = await createTestDb();
  });

  async function createOwner() {
    const res = await createAuth(db, { allowSignUp: true }).handler(post("/sign-up/email", OWNER));
    expect(res.status).toBe(200);
  }

  it("l'inscription publique est refusée (T-03)", async () => {
    const res = await createAuth(db).handler(post("/sign-up/email", OWNER));
    expect(res.ok).toBe(false);
    expect(await countUsers(db)).toBe(0);
  });

  it("le propriétaire se connecte et reçoit un cookie de 30 jours (F-SOC-2)", async () => {
    await createOwner();
    const res = await createAuth(db).handler(
      post("/sign-in/email", { email: OWNER.email, password: OWNER.password }),
    );
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Max-Age=2592000/);
  });

  it("un mauvais mot de passe répond 401", async () => {
    await createOwner();
    const res = await createAuth(db).handler(
      post("/sign-in/email", { email: OWNER.email, password: "mauvais-mot-de-passe" }),
    );
    expect(res.status).toBe(401);
  });

  it("la 6e tentative en 60 s répond 429 (T-04)", async () => {
    await createOwner();
    const auth = createAuth(db);
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await auth.handler(
        post("/sign-in/email", { email: OWNER.email, password: "mauvais-mot-de-passe" }),
      );
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true);
    expect(statuses[5]).toBe(429);
  });

  it("sessionInfoFrom renvoie l'utilisateur et isDemo = false", async () => {
    await createOwner();
    const auth = createAuth(db);
    const res = await auth.handler(
      post("/sign-in/email", { email: OWNER.email, password: OWNER.password }),
    );
    const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
    expect(await sessionInfoFrom(auth, new Headers({ cookie }))).toEqual({
      userId: expect.any(String),
      isDemo: false,
    });
  });

  it("sans cookie, sessionInfoFrom renvoie null", async () => {
    expect(await sessionInfoFrom(createAuth(db), new Headers())).toBeNull();
  });
});
