import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;

// Échoue tôt, en nommant chaque variable en défaut, plutôt que sur une erreur SQL plus tard.
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new Error(`Variables d'environnement invalides ou manquantes : ${names.join(", ")}`);
  }
  return result.data;
}

export const env = parseEnv(process.env);
