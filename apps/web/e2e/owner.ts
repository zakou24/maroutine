// Propriétaire créé par `pnpm e2e:prepare` dans la base PGlite e2e (identifiants publics, base jetable).
export const OWNER = { email: "e2e@maroutine.test", password: "e2e-mot-de-passe-solide" };

// État de session enregistré par auth.setup.ts ; à passer à test.use({ storageState }).
export const AUTH_FILE = "e2e/.auth/owner.json";
