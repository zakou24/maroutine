import { loginSchema, ownerPasswordSchema } from "@maroutine/core";
import { eq } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import { user } from "@/db/schema";
import { createAuth } from "./auth";

export type CreateOwnerResult = { ok: true } | { ok: false; reason: string };

// Seul chemin de création de compte (C1) : l'instance avec inscription n'est jamais exposée en HTTP.
export async function createOwner(
  db: AppDatabase,
  input: { email: string; password: string },
): Promise<CreateOwnerResult> {
  const login = loginSchema.safeParse(input);
  if (!login.success) return { ok: false, reason: "Email invalide." };
  if (!ownerPasswordSchema.safeParse(input.password).success) {
    return { ok: false, reason: "Le mot de passe doit faire entre 12 et 128 caractères." };
  }

  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.isDemo, false))
    .limit(1);
  if (existing.length > 0) return { ok: false, reason: "Un propriétaire existe déjà." };

  await createAuth(db, { allowSignUp: true }).api.signUpEmail({
    body: { email: login.data.email, password: login.data.password, name: "Propriétaire" },
  });
  return { ok: true };
}
