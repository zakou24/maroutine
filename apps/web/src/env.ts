import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().trim().min(1),
  BETTER_AUTH_SECRET: z.string().trim().min(32),
  BETTER_AUTH_URL: z.string().trim().pipe(z.url()),
});

export type Env = z.infer<typeof envSchema>;

// Échoue tôt, en nommant chaque variable en défaut, plutôt que sur une erreur SQL plus tard.
export function parseEnv(source: Record<string, string | undefined>): Env {
  // Un aperçu Vercel a sa propre adresse : on la prend si BETTER_AUTH_URL n'est pas fixée.
  const previewUrl =
    source.VERCEL_ENV === "preview" && source.VERCEL_BRANCH_URL
      ? `https://${source.VERCEL_BRANCH_URL}`
      : undefined;
  const result = envSchema.safeParse({
    ...source,
    BETTER_AUTH_URL: source.BETTER_AUTH_URL?.trim() || previewUrl,
  });
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new Error(`Variables d'environnement invalides ou manquantes : ${names.join(", ")}`);
  }
  return result.data;
}

export const env = parseEnv(process.env);
