import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb, type AppDatabase } from "@/db/client";
import { env } from "@/env";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function createAuth(
  database: AppDatabase,
  options: { allowSignUp?: boolean; autoSignIn?: boolean; baseURL?: string } = {},
) {
  const baseURL = options.baseURL ?? env.BETTER_AUTH_URL;
  return betterAuth({
    baseURL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [baseURL],
    database: drizzleAdapter(database, { provider: "pg" }),
    // Inscriptions fermées (C1, T-03) : seul `pnpm create-owner` passe allowSignUp, jamais via HTTP.
    emailAndPassword: {
      enabled: true,
      disableSignUp: !options.allowSignUp,
      autoSignIn: options.autoSignIn ?? true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    session: { expiresIn: THIRTY_DAYS, updateAge: 60 * 60 * 24 },
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: { "/sign-in/email": { window: 60, max: 5 } },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
      // Better Auth coupe ce contrôle quand NODE_ENV=test : on le veut partout, tests compris (T-07).
      disableOriginCheck: false,
    },
    user: {
      additionalFields: {
        isDemo: { type: "boolean", defaultValue: false, input: false },
      },
    },
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type SessionInfo = { userId: string; isDemo: boolean };

export async function sessionInfoFrom(auth: Auth, headers: Headers): Promise<SessionInfo | null> {
  const session = await auth.api.getSession({ headers });
  if (!session) return null;
  return { userId: session.user.id, isDemo: session.user.isDemo === true };
}

// Créée au premier appel, jamais à l'import : le build n'a pas besoin de base.
let instance: Auth | undefined;

export function getAuth(): Auth {
  instance ??= createAuth(getDb());
  return instance;
}

export function getSessionInfo(headers: Headers): Promise<SessionInfo | null> {
  return sessionInfoFrom(getAuth(), headers);
}
