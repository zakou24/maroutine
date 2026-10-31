import { beforeEach, describe, expect, it } from "vitest";
import type { AppDatabase } from "@/db/client";
import { createAuth } from "@/server/auth";
import { createTestDb } from "../helpers/test-db";

// Better Auth coupe son contrôle d'origine quand NODE_ENV=test : createAuth le force à false.
const ORIGIN = "http://localhost:3000";
const OWNER = { email: "zak@mail.com", password: "correct-horse-battery", name: "Propriétaire" };

function post(path: string, body: unknown, headers: Record<string, string>) {
  return new Request(`${ORIGIN}/api/auth${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7", ...headers },
    body: JSON.stringify(body),
  });
}

describe("contrôle d'origine de Better Auth (T-07)", () => {
  let db: AppDatabase;
  let cookie: string;

  beforeEach(async () => {
    db = await createTestDb();
    await createAuth(db, { allowSignUp: true }).api.signUpEmail({ body: OWNER });
    const res = await createAuth(db).handler(
      post("/sign-in/email", { email: OWNER.email, password: OWNER.password }, { origin: ORIGIN }),
    );
    cookie = (res.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
  });

  it("POST /sign-out avec une Origin étrangère et le cookie du propriétaire : 403", async () => {
    const res = await createAuth(db).handler(
      post("/sign-out", {}, { origin: "https://evil.example", cookie }),
    );
    expect(res.status).toBe(403);
  });

  it("POST /sign-out depuis l'origine de l'app : 200", async () => {
    const res = await createAuth(db).handler(post("/sign-out", {}, { origin: ORIGIN, cookie }));
    expect(res.status).toBe(200);
  });
});
