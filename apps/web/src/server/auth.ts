import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, type AppDatabase } from "@/db/client";
import { env } from "@/env";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function createAuth(
  database: AppDatabase,
  options: { allowSignUp?: boolean; baseURL?: string } = {},
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
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    session: { expiresIn: THIRTY_DAYS, updateAge: 60 * 60 * 24 },
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: { "/sign-in/email": { window: 60, max: 5 } },
    },
    advanced: { ipAddress: { ipAddressHeaders: ["x-forwarded-for"] } },
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

export const auth = createAuth(db);

export function getSessionInfo(headers: Headers): Promise<SessionInfo | null> {
  return sessionInfoFrom(auth, headers);
}
