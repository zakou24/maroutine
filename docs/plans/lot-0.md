# Lot 0 : Socle — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Statut : non démarré.**

**Goal :** poser le monorepo, une app Next.js déployée sur Vercel avec sa base Neon, la connexion du propriétaire (sans inscription), une garde d'API réutilisable par tous les lots, l'app installable sur iPhone, et une CI verte.

**Architecture :** monorepo pnpm avec `packages/core` (TypeScript pur, Zod seulement) et `apps/web` (Next.js App Router). Better Auth gère la session sur Drizzle et Neon. Toutes les futures routes `/api/v1` passent par `apiHandler`, qui authentifie, vérifie l'origine, bloque les écritures du compte démo et traduit les erreurs. Les tests d'intégration tournent sur PGlite, sans réseau ni Docker.

**Tech Stack :** Node.js 24 LTS, pnpm 10, Next.js (App Router), React, TypeScript strict, Tailwind CSS 4, shadcn/ui, Zod 4, Drizzle ORM + Drizzle Kit, `@neondatabase/serverless`, Better Auth, Vitest, PGlite, Testing Library, Playwright, axe-core, GitHub Actions, gitleaks.

**Spec :** [SPEC.md](../SPEC.md) (§2 module `socle`, F-SOC-1 à F-SOC-3, NF-3, NF-7, §5, §7, §8, §9, §11), [decisions-ouvertes.md](../decisions-ouvertes.md) (C1, C14, D13), [threat-model.md](../threat-model.md) (T-03 à T-07), ADR [0001](../adr/0001-stack-technique.md), [0002](../adr/0002-pwa-plutot-qu-app-native.md), [0003](../adr/0003-logique-metier-dans-core.md), [0004](../adr/0004-api-rest-plutot-que-server-actions.md), [0008](../adr/0008-mode-demo-et-inscriptions-fermees.md), [0009](../adr/0009-base-de-donnees-dev-et-tests.md). Maquettes : [canevas, direction A](https://claude.ai/artifact/WStbXSegxDLEsFJhceFYXC).

## Critère de fin du lot

Le propriétaire ouvre l'URL Vercel dans Safari sur son iPhone, ajoute l'app à l'écran d'accueil, l'ouvre en plein écran, se connecte, ferme l'app, la rouvre le lendemain sans se reconnecter. Le workflow `ci.yml` est vert sur `main`.

## Global Constraints

- Budget 0 € : Vercel Hobby, Neon Free via Vercel Marketplace, dépôt GitHub public. Aucun service payant.
- Aucune Server Action : la directive `"use server"` est interdite par ESLint dans `apps/web` (ADR 0004).
- `packages/core` n'importe que `zod` (règle ESLint `no-restricted-imports`, ADR 0003).
- Configuration uniquement par variables d'environnement, chacune documentée dans `.env.example` sans valeur réelle.
- Inscriptions désactivées. Le compte du propriétaire n'est créé que par `pnpm create-owner` (C1, T-03).
- Mot de passe du propriétaire : 12 caractères minimum (T-04).
- Session : 30 jours (F-SOC-2). Cookie `HttpOnly`, `Secure` en production, `SameSite=Lax` (T-06, T-07).
- Interface en français, vocabulaire de [GLOSSARY.md](../GLOSSARY.md).
- Direction visuelle A : fond `#F5F7F9`, surface `#FFFFFF`, encre `#172033`, texte secondaire `#4A5568`, filets `#D9E0E8`, action `#1F5FA8`, couloir `#E3ECF7`, régression `#B4470E` (texte `#8A3409`), police Atkinson Hyperlegible, chiffres tabulaires, rayons 12 px (cartes) et 8 px (champs), cibles tactiles ≥ 44 px.
- Pas de Docker. Développement local sur une branche Neon `dev`, tests sur PGlite (C14).
- Commits en Conventional Commits.
- Versions : dernières stables à la date d'exécution, consignées dans l'ADR 0001 (tâche 1).

## Review Focus

1. **Variable d'environnement absente ou vide** (`.env.local` oublié, variable manquante sur Vercel) : l'app doit refuser de démarrer avec un message qui nomme la variable, et non planter plus tard sur une erreur SQL obscure. Test : tâche 2, `parseEnv`.
2. **Email saisi sur iPhone avec majuscule initiale ou espace final** (`Zak@mail.com `) : la connexion doit réussir. Test : tâche 1, `loginSchema` ; tâche 6, attributs du champ.
3. **Mot de passe faux répété** : au-delà de 5 tentatives en 60 s depuis la même IP, réponse 429, pas d'essais illimités. Test : tâche 4.
4. **Appel direct à l'inscription** (`POST /api/auth/sign-up/email`) : refusé, aucun utilisateur créé. Test : tâche 4.
5. **Écriture depuis un autre site** (requête `POST` avec un en-tête `Origin` étranger et le cookie du propriétaire) : 403. Test : tâche 5.

---

## Structure des fichiers

```
MaRoutine/                                  racine du dépôt git
  .github/workflows/ci.yml
  .githooks/pre-commit                      gitleaks protect --staged
  .gitignore  .editorconfig  .nvmrc  .prettierrc  .env.example
  package.json  pnpm-workspace.yaml  tsconfig.base.json
  CLAUDE.md  PRODUCT.md  README.md
  docs/                                     ex-Docs/, déplacé en tâche 1
  packages/core/
    package.json  tsconfig.json  eslint.config.mjs  vitest.config.ts
    src/index.ts
    src/schemas/auth.ts                     loginSchema, ownerPasswordSchema
    src/schemas/auth.test.ts
  apps/web/
    package.json  next.config.ts  tsconfig.json  eslint.config.mjs
    vitest.config.ts  playwright.config.ts  drizzle.config.ts  components.json
    drizzle/                                migrations générées
    scripts/create-owner.ts
    src/env.ts                              parseEnv, env
    src/db/client.ts                        createDb, db, type AppDatabase
    src/db/schema/auth.ts                   tables Better Auth (générées)
    src/db/schema/index.ts
    src/server/auth.ts                      createAuth, auth, getSessionInfo
    src/server/http/errors.ts               NotFoundError
    src/server/http/api-handler.ts          createApiHandler, apiHandler
    src/lib/auth-client.ts                  authClient
    src/app/layout.tsx  src/app/globals.css
    src/app/manifest.ts  src/app/apple-icon.tsx  src/app/icons/[size]/route.tsx
    src/app/api/auth/[...all]/route.ts
    src/app/api/v1/health/route.ts
    src/app/(public)/connexion/page.tsx
    src/app/(public)/connexion/login-form.tsx
    src/app/(app)/layout.tsx                garde de session
    src/app/(app)/page.tsx                  accueil provisoire
    src/components/ui/                      shadcn : button, input, label
    tests/helpers/test-db.ts                createTestDb (PGlite + migrations)
    tests/integration/*.test.ts
    e2e/socle.spec.ts
```

---

### Tâche 1 : Dépôt, monorepo et `packages/core`

**Files :**
- Create : fichiers racine listés ci-dessus (hors `.github`, `.githooks`), `packages/core/*`
- Modify : déplacer `Docs/` vers `docs/` ; dans `CLAUDE.md` et `PRODUCT.md`, remplacer les liens `Docs/` par `docs/` ; `docs/adr/0001-stack-technique.md` (section Versions)
- Test : `packages/core/src/schemas/auth.test.ts`

**Interfaces :**
- Produces : `@maroutine/core` exporte `loginSchema` (`{ email: string; password: string }`, email nettoyé) et `ownerPasswordSchema` (`string`, 12 à 128 caractères). Scripts racine `pnpm lint`, `pnpm typecheck`, `pnpm test` qui s'exécutent dans chaque paquet (`pnpm -r`).

- [ ] **Étape 1 : initialiser le dépôt**

`git init -b main` à la racine `MaRoutine/`, `mv Docs docs` (rien n'est encore suivi par git), puis mise à jour des liens. `.gitignore` couvre `node_modules`, `.next`, `.env*` sauf `.env.example`, `.vercel`, `coverage`, `playwright-report`, `test-results`, `.superpowers`, `.impeccable/live`, `.DS_Store`. `.nvmrc` : `24`. `pnpm-workspace.yaml` : `apps/*`, `packages/*`. `tsconfig.base.json` : `strict`, `noUncheckedIndexedAccess`, `module`/`moduleResolution` `bundler`, `target` `ES2022`.

- [ ] **Étape 2 : figer les versions**

Relever avec `npm view <paquet> version` les versions stables de chaque outil du Tech Stack et les écrire dans la section Versions de l'ADR 0001, avec la date. Ces versions sont utilisées telles quelles dans les tâches suivantes.

- [ ] **Étape 3 : écrire le test qui échoue**

```ts
// packages/core/src/schemas/auth.test.ts
import { describe, expect, it } from "vitest";
import { loginSchema, ownerPasswordSchema } from "./auth";

describe("loginSchema", () => {
  it("nettoie l'email saisi sur mobile", () => {
    expect(loginSchema.parse({ email: "  Zak@Mail.COM ", password: "x" }).email).toBe("zak@mail.com");
  });
  it("refuse un email invalide", () => {
    expect(loginSchema.safeParse({ email: "zak", password: "x" }).success).toBe(false);
  });
  it("refuse un mot de passe vide", () => {
    expect(loginSchema.safeParse({ email: "a@b.fr", password: "" }).success).toBe(false);
  });
});

describe("ownerPasswordSchema", () => {
  it("exige 12 caractères", () => {
    expect(ownerPasswordSchema.safeParse("a".repeat(11)).success).toBe(false);
    expect(ownerPasswordSchema.safeParse("a".repeat(12)).success).toBe(true);
  });
  it("plafonne à 128 caractères", () => {
    expect(ownerPasswordSchema.safeParse("a".repeat(129)).success).toBe(false);
  });
});
```

- [ ] **Étape 4 : vérifier l'échec**

Run : `pnpm --filter @maroutine/core test`
Expected : FAIL, module `./auth` introuvable.

- [ ] **Étape 5 : implémenter `loginSchema` et `ownerPasswordSchema` dans `packages/core/src/schemas/auth.ts`, réexportés par `src/index.ts`**

Email : `trim` puis minuscules, puis validation email. Mot de passe de connexion : au moins 1 caractère (la longueur minimale n'est imposée qu'à la création).

- [ ] **Étape 6 : vérifier le succès**

Run : `pnpm --filter @maroutine/core test`
Expected : PASS, 5 tests.

- [ ] **Étape 7 : règle de frontière de `core`**

`packages/core/eslint.config.mjs` : `no-restricted-imports` avec `patterns` interdisant tout sauf `zod` et les chemins relatifs. Vérification : ajouter temporairement `import "next";` dans `src/index.ts`, lancer `pnpm --filter @maroutine/core lint`, constater l'erreur, retirer la ligne.

- [ ] **Étape 8 : commit**

```bash
git add -A
git commit -m "chore: init monorepo and core auth schemas"
```

---

### Tâche 2 : Application Next.js, thème de la direction A, configuration

**Files :**
- Create : `apps/web/` (via create-next-app), `src/env.ts`, `src/app/api/v1/health/route.ts`, `src/app/globals.css` (thème), `src/app/layout.tsx`, `components.json`, `src/components/ui/{button,input,label}.tsx`, `.env.example`
- Test : `apps/web/tests/integration/env.test.ts`, `apps/web/tests/integration/health.test.ts`

**Interfaces :**
- Consumes : `@maroutine/core` (dépendance `workspace:*`, `transpilePackages` dans `next.config.ts`).
- Produces : `parseEnv(source: Record<string, string | undefined>): Env` et `env: Env`, avec `Env = { DATABASE_URL: string; BETTER_AUTH_SECRET: string; BETTER_AUTH_URL: string }`. Utilitaires Tailwind du thème : `bg-ground`, `bg-surface`, `text-ink`, `text-muted`, `border-rule`, `bg-action`, `text-action`, `bg-corridor`, `text-regression`.

- [ ] **Étape 1 : créer l'app**

`pnpm create next-app@<version figée> apps/web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --yes`, puis nom du paquet `@maroutine/web`. Initialiser shadcn/ui en mode non interactif, puis ajouter `button`, `input`, `label`.

- [ ] **Étape 2 : écrire les tests qui échouent**

```ts
// apps/web/tests/integration/env.test.ts
import { describe, expect, it } from "vitest";
import { parseEnv } from "@/env";

const valid = {
  DATABASE_URL: "postgres://u:p@h/db",
  BETTER_AUTH_SECRET: "s".repeat(32),
  BETTER_AUTH_URL: "https://maroutine.vercel.app",
};

describe("parseEnv", () => {
  it("accepte une configuration complète", () => {
    expect(parseEnv(valid).BETTER_AUTH_URL).toBe("https://maroutine.vercel.app");
  });
  it("nomme chaque variable manquante", () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: undefined, BETTER_AUTH_SECRET: "" }))
      .toThrow(/DATABASE_URL.*BETTER_AUTH_SECRET|BETTER_AUTH_SECRET.*DATABASE_URL/s);
  });
  it("refuse un secret de moins de 32 caractères", () => {
    expect(() => parseEnv({ ...valid, BETTER_AUTH_SECRET: "court" })).toThrow(/BETTER_AUTH_SECRET/);
  });
});
```

```ts
// apps/web/tests/integration/health.test.ts
import { expect, it } from "vitest";
import { GET } from "@/app/api/v1/health/route";

it("GET /api/v1/health répond ok sans session", async () => {
  const res = await GET();
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
});
```

- [ ] **Étape 3 : vérifier l'échec**

Run : `pnpm --filter @maroutine/web test`
Expected : FAIL, modules introuvables.

- [ ] **Étape 4 : implémenter `parseEnv` / `env` dans `src/env.ts` et `GET` dans `src/app/api/v1/health/route.ts`**

`parseEnv` valide avec Zod (chaîne non vide, `BETTER_AUTH_URL` URL, secret ≥ 32 caractères) et lève une `Error` dont le message liste toutes les variables en défaut. `env = parseEnv(process.env)`.

- [ ] **Étape 5 : vérifier le succès**

Run : `pnpm --filter @maroutine/web test`
Expected : PASS.

- [ ] **Étape 6 : thème et police**

Dans `globals.css`, déclarer les couleurs des Global Constraints en jetons `@theme` sous les noms des Interfaces, `font-variant-numeric: tabular-nums` sur `body`, la sélection de texte et l'anneau de focus en `#1F5FA8`. Dans `layout.tsx`, charger Atkinson Hyperlegible (400, 700) par `next/font/google` (auto-hébergée au build), `lang="fr"`. `.env.example` : les trois variables, sans valeur, une ligne de commentaire chacune.

- [ ] **Étape 7 : interdire les Server Actions**

Dans `apps/web/eslint.config.mjs` : `no-restricted-syntax` avec le sélecteur `ExpressionStatement[directive='use server']` et le message « Server Actions interdites (ADR 0004) : passer par /api/v1 ». Vérification : ajouter temporairement `"use server";` en tête d'un fichier, `pnpm --filter @maroutine/web lint` échoue, retirer la ligne.

- [ ] **Étape 8 : vérifier l'ensemble**

Run : `pnpm lint && pnpm typecheck && pnpm test`
Expected : tout passe.

- [ ] **Étape 9 : commit**

```bash
git add -A
git commit -m "feat(web): scaffold next app with theme, env validation and health route"
```

---

### Tâche 3 : Base de données, Drizzle et base de test

**Files :**
- Create : `apps/web/drizzle.config.ts`, `src/db/client.ts`, `src/db/schema/index.ts` (vide à ce stade), `tests/helpers/test-db.ts`
- Test : `apps/web/tests/integration/test-db.test.ts`

**Interfaces :**
- Consumes : `env.DATABASE_URL` (tâche 2).
- Produces : `type AppDatabase` (base Drizzle PostgreSQL typée avec `schema`), `createDb(url: string): AppDatabase` (driver `drizzle-orm/neon-serverless` + `Pool`), `db: AppDatabase`, `createTestDb(): Promise<AppDatabase>` (PGlite en mémoire, migrations de `drizzle/` appliquées). Scripts `db:generate`, `db:migrate`.

- [ ] **Étape 1 : écrire le test qui échoue**

```ts
// apps/web/tests/integration/test-db.test.ts
import { sql } from "drizzle-orm";
import { expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";

it("createTestDb fournit une base PostgreSQL vierge et isolée", async () => {
  const a = await createTestDb();
  const b = await createTestDb();
  await a.execute(sql`create table t (id int)`);
  const { rows } = await b.execute(sql`select count(*)::int as n from information_schema.tables where table_name = 't'`);
  expect(rows[0]).toEqual({ n: 0 });
});
```

- [ ] **Étape 2 : vérifier l'échec**

Run : `pnpm --filter @maroutine/web test test-db`
Expected : FAIL, `createTestDb` introuvable.

- [ ] **Étape 3 : implémenter le client et la base de test**

`createDb` et `db` dans `src/db/client.ts`. `createTestDb` dans `tests/helpers/test-db.ts` : `drizzle(new PGlite(), { schema })`, puis `migrate` depuis `drizzle/` quand le dossier contient des migrations (la première arrive à la tâche 4).

- [ ] **Étape 4 : vérifier le succès**

Run : `pnpm --filter @maroutine/web test test-db`
Expected : PASS.

- [ ] **Étape 5 : commit**

```bash
git add -A
git commit -m "feat(db): add drizzle client and pglite test db"
```

---

### Tâche 4 : Authentification (Better Auth)

**Files :**
- Create : `src/server/auth.ts`, `src/db/schema/auth.ts` (généré par la CLI Better Auth, adaptateur Drizzle), `src/app/api/auth/[...all]/route.ts`, `src/lib/auth-client.ts`, `scripts/create-owner.ts`
- Test : `apps/web/tests/integration/auth.test.ts`, `apps/web/tests/integration/migrations.test.ts`

**Interfaces :**
- Consumes : `AppDatabase`, `createTestDb` (tâche 3), `ownerPasswordSchema` (tâche 1), `env` (tâche 2).
- Produces :
  - `createAuth(db: AppDatabase, options?: { allowSignUp?: boolean; baseURL?: string }): Auth` ; `auth = createAuth(db)`.
  - `type SessionInfo = { userId: string; isDemo: boolean }` ; `getSessionInfo(headers: Headers): Promise<SessionInfo | null>`.
  - Champ utilisateur additionnel `isDemo` (booléen, défaut `false`, non modifiable par l'utilisateur).
  - `authClient` (client React Better Auth, même origine).
  - `pnpm create-owner` : demande email et mot de passe sur le terminal, valide avec `loginSchema` / `ownerPasswordSchema`, crée l'utilisateur par `createAuth(db, { allowSignUp: true }).api.signUpEmail`. Cette instance n'est jamais exposée en HTTP.

- [ ] **Étape 1 : écrire les tests qui échouent**

Tests appelés directement sur `auth.handler(new Request(...))`, avec une base `createTestDb()` neuve par test et l'en-tête `x-forwarded-for: 203.0.113.7`. Le propriétaire est créé par une instance `allowSignUp: true` sur la même base.

```ts
// apps/web/tests/integration/migrations.test.ts
it("les migrations créent les tables d'authentification", async () => {
  const db = await createTestDb();
  const { rows } = await db.execute(sql`
    select table_name from information_schema.tables where table_schema = 'public'`);
  const tables = rows.map((r) => r.table_name);
  expect(tables).toEqual(expect.arrayContaining(["user", "session", "account", "verification"]));
  expect(tables.some((t) => /rate.?limit/i.test(String(t)))).toBe(true);
});
```

```ts
// apps/web/tests/integration/auth.test.ts (assertions)
it("l'inscription publique est refusée (T-03)", async () => {
  // POST /api/auth/sign-up/email sur createAuth(db)
  expect(res.ok).toBe(false);
  expect(await countUsers(db)).toBe(0);
});
it("le propriétaire se connecte et reçoit un cookie de 30 jours (F-SOC-2)", async () => {
  // POST /api/auth/sign-in/email { email: "zak@mail.com", password: "correct-horse-battery" }
  expect(res.status).toBe(200);
  const cookie = res.headers.get("set-cookie") ?? "";
  expect(cookie).toMatch(/HttpOnly/i);
  expect(cookie).toMatch(/SameSite=Lax/i);
  expect(cookie).toMatch(/Max-Age=2592000/);
});
it("un mauvais mot de passe répond 401", async () => {
  expect(res.status).toBe(401);
});
it("la 6e tentative en 60 s répond 429 (T-04)", async () => {
  // 6 POST sign-in avec mauvais mot de passe, même IP
  expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true);
  expect(statuses[5]).toBe(429);
});
it("getSessionInfo renvoie l'utilisateur et isDemo = false", async () => {
  expect(await getSessionInfo(headersWithCookie)).toEqual({ userId: expect.any(String), isDemo: false });
});
```

- [ ] **Étape 2 : vérifier l'échec**

Run : `pnpm --filter @maroutine/web test auth migrations`
Expected : FAIL, `createAuth` introuvable et aucune table.

- [ ] **Étape 3 : implémenter `createAuth` dans `src/server/auth.ts`**

Valeurs imposées : `emailAndPassword: { enabled: true, disableSignUp: !allowSignUp, minPasswordLength: 12, maxPasswordLength: 128 }`, `session: { expiresIn: 2592000, updateAge: 86400 }`, `rateLimit: { enabled: true, storage: "database", customRules: { "/sign-in/email": { window: 60, max: 5 } } }`, `trustedOrigins: [baseURL]`, `user.additionalFields.isDemo` (`boolean`, `defaultValue: false`, `input: false`), adaptateur Drizzle `provider: "pg"`. Générer `src/db/schema/auth.ts` avec la CLI Better Auth, puis `pnpm db:generate`. Si `x-forwarded-for` n'est pas l'en-tête lu par défaut, le déclarer dans `advanced.ipAddress.ipAddressHeaders` (Vercel le fournit).

- [ ] **Étape 4 : vérifier le succès**

Run : `pnpm --filter @maroutine/web test`
Expected : PASS, migrations comprises.

- [ ] **Étape 5 : script `create-owner`**

Lancé avec `tsx` et `DATABASE_URL` en environnement. Il refuse de créer un second propriétaire si un utilisateur non démo existe déjà (message clair, code de sortie 1). Vérification manuelle sur la branche Neon `dev` : premier lancement OK, second lancement refusé.

- [ ] **Étape 6 : commit**

```bash
git add -A
git commit -m "feat(auth): add better-auth with closed sign-up, 30-day sessions and rate limit"
```

---

### Tâche 5 : Garde d'API `apiHandler`

**Files :**
- Create : `src/server/http/errors.ts`, `src/server/http/api-handler.ts`
- Test : `apps/web/tests/integration/api-handler.test.ts`

**Interfaces :**
- Consumes : `SessionInfo`, `getSessionInfo` (tâche 4), `env.BETTER_AUTH_URL`.
- Produces (utilisé par toutes les routes `/api/v1` des lots suivants) :
  - `class NotFoundError extends Error`.
  - `createApiHandler(deps: { getSession: (headers: Headers) => Promise<SessionInfo | null>; appOrigin: string })` qui renvoie `apiHandler`.
  - `apiHandler<P>(handler: (ctx: { request: Request; session: SessionInfo; params: P }) => Promise<Response>): (request: Request, route: { params: Promise<P> }) => Promise<Response>`.
  - `apiHandler` exporté, construit avec `getSessionInfo` et `env.BETTER_AUTH_URL`.

- [ ] **Étape 1 : écrire les tests qui échouent**

`createApiHandler` reçoit un faux `getSession`. Chaque test enveloppe un handler minimal.

```ts
// apps/web/tests/integration/api-handler.test.ts (assertions)
it("sans session : 401 et le handler n'est pas appelé", ...);            // status 401
it("POST avec Origin étranger : 403 (T-07)", ...);                        // Origin: https://evil.example → 403
it("POST sans en-tête Origin : 403", ...);
it("GET avec Origin étranger : passe (lecture)", ...);                    // 200
it("compte démo : POST, PUT, PATCH, DELETE répondent 403", ...);          // isDemo: true
it("compte démo : GET passe", ...);                                        // 200
it("ZodError levée par le handler : 400 { error: 'invalid' }", ...);
it("NotFoundError : 404 { error: 'not_found' }", ...);
it("erreur inattendue : 500 { error: 'internal' } sans message interne", ...);
it("le handler reçoit l'utilisateur de la session, jamais celui du corps", ...); // corps { userId: "autre" } → ctx.session.userId === "owner"
```

- [ ] **Étape 2 : vérifier l'échec**

Run : `pnpm --filter @maroutine/web test api-handler`
Expected : FAIL.

- [ ] **Étape 3 : implémenter `createApiHandler` et `apiHandler`**

Ordre des contrôles : session (401), puis pour toute méthode autre que `GET` et `HEAD` : `Origin` égal à `appOrigin` (403), puis compte démo (403), puis handler. Erreurs traduites comme dans les tests. Les réponses d'erreur sont en JSON. Aucune journalisation du corps de requête (T-11).

- [ ] **Étape 4 : vérifier le succès**

Run : `pnpm --filter @maroutine/web test`
Expected : PASS.

- [ ] **Étape 5 : commit**

```bash
git add -A
git commit -m "feat(api): add api handler guard with session, origin and demo checks"
```

---

### Tâche 6 : Écrans Connexion et Accueil provisoire

**Files :**
- Create : `src/app/(public)/connexion/page.tsx`, `src/app/(public)/connexion/login-form.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx`
- Test : `apps/web/tests/integration/login-form.test.tsx` (Vitest + Testing Library, environnement `jsdom` pour ce fichier)

**Interfaces :**
- Consumes : `authClient` (tâche 4), `loginSchema` (tâche 1), `auth.api.getSession` (tâche 4), thème (tâche 2).
- Produces : route `/connexion` publique ; groupe `(app)` protégé, qui redirige vers `/connexion` sans session. `/` affiche « Cette semaine », un texte « Tes stats arriveront au Lot 2. » et un bouton « Se déconnecter ».

Rendu selon la maquette A : fond `bg-ground`, carte `bg-surface` à filet `border-rule` et rayon 12 px, titre « MaRoutine » en 28 px gras, champs de 44 px de haut, bouton principal plein `bg-action` de 52 px. Pas de bouton démo à ce lot (Lot 6).

- [ ] **Étape 1 : écrire les tests qui échouent**

```tsx
// assertions de login-form.test.tsx (authClient.signIn.email simulé)
it("le champ email désactive la majuscule automatique", () => {
  const email = screen.getByLabelText("Email");
  expect(email).toHaveAttribute("autocapitalize", "none");
  expect(email).toHaveAttribute("autocomplete", "email");
  expect(email).toHaveAttribute("type", "email");
});
it("le champ mot de passe propose le gestionnaire de mots de passe", () => {
  expect(screen.getByLabelText("Mot de passe")).toHaveAttribute("autocomplete", "current-password");
});
it("envoie l'email nettoyé", async () => {
  // saisie "  Zak@Mail.com " + mot de passe, clic « Se connecter »
  expect(signIn).toHaveBeenCalledWith(expect.objectContaining({ email: "zak@mail.com" }));
});
it("affiche « Email ou mot de passe incorrect. » sur un 401", ...);
it("affiche « Trop de tentatives. Réessaie dans une minute. » sur un 429", ...);
it("désactive le bouton pendant l'envoi", ...);
```

- [ ] **Étape 2 : vérifier l'échec**

Run : `pnpm --filter @maroutine/web test login-form`
Expected : FAIL.

- [ ] **Étape 3 : implémenter le formulaire, la page, la garde et l'accueil**

Garde dans `(app)/layout.tsx` : `auth.api.getSession({ headers: await headers() })`, sinon `redirect("/connexion")`. Après connexion réussie : `router.replace("/")`. La page `/connexion` redirige vers `/` si une session existe déjà. Déconnexion : `authClient.signOut()`, puis `/connexion`.

- [ ] **Étape 4 : vérifier le succès**

Run : `pnpm --filter @maroutine/web test`
Expected : PASS.

- [ ] **Étape 5 : vérification manuelle**

`pnpm dev` (branche Neon `dev`, propriétaire créé en tâche 4) : se connecter, voir l'accueil, se déconnecter, constater qu'on revient sur `/connexion` et que `/` y redirige.

- [ ] **Étape 6 : commit**

```bash
git add -A
git commit -m "feat(web): add login screen, session guard and placeholder home"
```

---

### Tâche 7 : PWA installable et en-têtes de sécurité

**Files :**
- Create : `src/app/manifest.ts`, `src/app/icons/[size]/route.tsx`, `src/app/apple-icon.tsx`, `playwright.config.ts`, `e2e/socle.spec.ts`
- Modify : `src/app/layout.tsx` (metadata `appleWebApp`, `viewport`), `next.config.ts` (en-têtes)

**Interfaces :**
- Consumes : thème et page `/connexion` (tâches 2 et 6).
- Produces : `/manifest.webmanifest`, `/icons/192` et `/icons/512` (PNG), icône Apple 180 px. Playwright configuré pour tous les lots suivants : projet `iphone` (appareil iPhone 15, WebKit) et projet `desktop` (Chromium 1440 × 900), serveur `pnpm build && pnpm start`.

Icône : fond `#F5F7F9`, couloir `#E3ECF7` et courbe montante `#1F5FA8` de 8 % d'épaisseur, en `ImageResponse`, sans texte.

- [ ] **Étape 1 : écrire les tests e2e qui échouent**

```ts
// apps/web/e2e/socle.spec.ts (assertions)
test("manifeste installable (F-SOC-3, NF-3)", async ({ request }) => {
  const m = await (await request.get("/manifest.webmanifest")).json();
  expect(m).toMatchObject({ name: "MaRoutine", short_name: "MaRoutine", display: "standalone", start_url: "/", lang: "fr" });
  expect(m.icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  for (const icon of m.icons) {
    const res = await request.get(icon.src);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
  }
});
test("métadonnées iPhone présentes", async ({ page }) => {
  await page.goto("/connexion");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "MaRoutine");
});
test("en-têtes de sécurité (T-06)", async ({ request }) => {
  const h = (await request.get("/connexion")).headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});
test("sans session, / redirige vers /connexion", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/connexion$/);
});
test("connexion : aucun défilement horizontal et aucune violation axe", async ({ page }) => {
  await page.goto("/connexion");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
```

- [ ] **Étape 2 : vérifier l'échec**

Run : `pnpm --filter @maroutine/web test:e2e`
Expected : FAIL sur le manifeste, les métadonnées et les en-têtes.

- [ ] **Étape 3 : implémenter le manifeste, les icônes, les métadonnées et les en-têtes**

Manifeste : `background_color` et `theme_color` `#F5F7F9`, icônes 192 et 512 (`purpose: "any"`) plus 512 `maskable`. `appleWebApp: { capable: true, title: "MaRoutine", statusBarStyle: "default" }`. En-têtes sur toutes les routes : `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, et en production seulement : `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` (le serveur de dev de Next.js a besoin d'`eval`).

- [ ] **Étape 4 : vérifier le succès**

Run : `pnpm --filter @maroutine/web test:e2e`
Expected : PASS sur les deux projets, `iphone` et `desktop`.

- [ ] **Étape 5 : commit**

```bash
git add -A
git commit -m "feat(web): make app installable and add security headers"
```

---

### Tâche 8 : Intégration continue et détection de secrets

**Files :**
- Create : `.github/workflows/ci.yml`, `.githooks/pre-commit`, `README.md` (section « Démarrer »)

**Interfaces :**
- Produces : workflow `ci` sur `push` et `pull_request` vers `main`, jobs `secrets` (gitleaks sur tout l'historique) et `check` (pnpm install figé, lint, typecheck, tests Vitest, build, Playwright avec WebKit et Chromium, rapport en artefact en cas d'échec seulement). Le build reçoit des valeurs factices pour les trois variables, déclarées dans le workflow et non secrètes. Aucun test de CI n'accède à Neon.

- [ ] **Étape 1 : écrire le workflow et le hook**

Hook : `gitleaks protect --staged --redact`, activé par `git config core.hooksPath .githooks`. Il est documenté dans le README, avec l'installation `brew install gitleaks`.

- [ ] **Étape 2 : vérifier que gitleaks bloque**

Créer temporairement `leak.txt` contenant une chaîne au format `postgresql://user:motdepasse@ep-exemple.eu-central-1.aws.neon.tech/db`, `git add leak.txt`, `git commit` doit échouer. Retirer le fichier.

- [ ] **Étape 3 : pousser et vérifier la CI**

Créer le dépôt GitHub public (action du propriétaire : `gh repo create maroutine --public --source . --push`).
Expected : workflow `ci` vert sur `main`.

- [ ] **Étape 4 : commit**

```bash
git add -A
git commit -m "ci: add lint, test, build, e2e and gitleaks workflow"
```

---

### Tâche 9 : Déploiement Vercel, base Neon et iPhone

Tâche à faire avec le propriétaire, qui crée les comptes et valide chaque action payante éventuelle (il ne doit y en avoir aucune).

**Files :**
- Modify : `CLAUDE.md` (état, commandes réelles), `docs/adr/0001-stack-technique.md` (offres réellement souscrites), `README.md`

**Interfaces :**
- Consumes : tout le lot.
- Produces : projet Vercel lié au dépôt (répertoire racine `apps/web`), base Neon de l'intégration Vercel Marketplace avec les branches `main` (production), `dev` et `preview`, variables d'environnement par environnement, propriétaire créé en production.

- [ ] **Étape 1 : outillage**

`npm i -g vercel`, `vercel login`, `vercel link` depuis la racine (répertoire racine du projet : `apps/web`).

- [ ] **Étape 2 : base Neon par la Marketplace**

Installer l'intégration Neon depuis Vercel (offre gratuite), vérifier sur la page de facturation que le coût est 0 €. Créer les branches `dev` et `preview`. Renseigner `DATABASE_URL` par environnement, `BETTER_AUTH_SECRET` (généré par `openssl rand -base64 32`, différent par environnement) et `BETTER_AUTH_URL` (URL de production ; pour les aperçus, l'URL du déploiement).

- [ ] **Étape 3 : migrer et créer le propriétaire en production**

`vercel env pull .env.production.local --environment=production` (fichier ignoré par git), puis `pnpm db:migrate` et `pnpm create-owner` avec ce fichier. Supprimer le fichier ensuite.

- [ ] **Étape 4 : déployer**

Push sur `main`.
Expected : déploiement Vercel réussi, `GET /api/v1/health` répond `{"status":"ok"}` sur l'URL de production.

- [ ] **Étape 5 : critère de fin sur iPhone**

Sur l'iPhone du propriétaire, dans Safari : URL de production, Partager, « Sur l'écran d'accueil ». Vérifier l'icône et le nom « MaRoutine », l'ouverture plein écran sans barre Safari, la connexion, puis la réouverture après fermeture sans nouvelle connexion. Le lendemain, revérifier la réouverture.

- [ ] **Étape 6 : mettre à jour la documentation et commiter**

`CLAUDE.md` : phase « Lot 0 terminé », commandes réelles (§7 de la spec confirmé ou corrigé). ADR 0001 : offres et limites constatées.

```bash
git add -A
git commit -m "docs: record lot 0 deployment and real commands"
```
