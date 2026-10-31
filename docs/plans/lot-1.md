# Lot 1 : Séances — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Statut : en cours** (branche `lot-1`).

**Goal :** le propriétaire gère sa liste d'exercices, saisit chaque soir sa séance (séries `charge × répétitions` préremplies depuis la dernière fois), modifie ou supprime une séance passée, et voit ses jours de séance dans un calendrier, sur iPhone comme sur ordinateur.

**Architecture :** les règles de validation, les types échangés, la lecture des décimales à la française et les calculs de dates vivent dans `packages/core`. L'API REST `/api/v1/exercises` et `/api/v1/workouts` passe par `apiHandler` et par des services filtrés par l'utilisateur de la session. Une séance s'écrit en une seule requête (`PUT` de la structure complète, dans une transaction). Côté interface, les écrans sont des pages serveur minces qui montent des composants client. Ceux-ci lisent et écrivent par TanStack Query via l'API, jamais par la base. Le développement local et les tests e2e tournent sur une base PGlite en fichier, ce qui sépare enfin la production du reste.

**Tech Stack :** celle du Lot 0, plus TanStack Query (version figée à la tâche 1 dans l'ADR 0001).

**Spec :** [SPEC.md](../SPEC.md) §2 module `seances`, F-SEA-1 à F-SEA-6, NF-1, NF-2, NF-5, NF-7, NF-8, §5 (routes Exercices, Séances, Préremplissage), [architecture.md](../architecture.md) §3, §4, §7, §8, [GLOSSARY.md](../GLOSSARY.md), [decisions-ouvertes.md](../decisions-ouvertes.md) (C3, C4, C13, D13), [threat-model.md](../threat-model.md) (T-01, T-12), ADR [0003](../adr/0003-logique-metier-dans-core.md), [0004](../adr/0004-api-rest-plutot-que-server-actions.md), [0009](../adr/0009-base-de-donnees-dev-et-tests.md). Maquettes : [canevas, direction A](https://claude.ai/artifact/WStbXSegxDLEsFJhceFYXC) (Saisie du soir, Tableau de bord).

## Hors du lot

- **La suggestion à côté de chaque exercice (fin de F-SEA-3) arrive au Lot 2** avec les règles de l'ADR 0006. Le Lot 1 ne fait que le préremplissage.
- La fiche exercice avec ses courbes (Lot 2), la pesée (Lot 3), l'alimentation (Lot 4) et le tableau de bord complet (Lot 5). L'écran Saisie du soir n'a ici que sa section Séance, et l'accueil reste une vue simple de la semaine.

## Critère de fin du lot

Sur son iPhone, le soir, le propriétaire crée ses exercices, saisit une séance de 5 exercices dont les séries se préremplissent depuis la séance précédente, l'enregistre, la retrouve dans le calendrier, la corrige, puis en supprime une autre. Le tout se fait en production, après une fusion de la PR du lot avec une CI verte. La migration de production s'applique d'elle-même au déploiement.

## Global Constraints

- Toutes celles du [Lot 0](lot-0.md#global-constraints), toujours valables : 0 €, aucune Server Action, `core` n'importe que `zod`, interface en français, direction visuelle A, cibles tactiles ≥ 44 px, Conventional Commits.
- Chaque requête de service filtre par `userId` de la session. Une ressource d'un autre utilisateur répond **404**, même quand son identifiant arrive dans le corps de la requête (T-01).
- Unités et dates (C13) : kilogrammes ; `performedOn` est une date calendaire `AAAA-MM-JJ` sans heure ; « aujourd'hui » se calcule dans le fuseau `Europe/Paris`.
- Charges : de 0 à 999,75 kg, au pas de 0,25 kg, saisies avec une virgule ou un point. Répétitions : entiers de 0 à 100. Une série d'échauffement se coche mais n'entre jamais dans les stats (C4, pour le Lot 2).
- Exercice : nom de 1 à 60 caractères, unique par utilisateur sans tenir compte de la casse ; fourchette par défaut 6–10 (min ≥ 1, max ≥ min, max ≤ 50) ; pas d'augmentation > 0 et ≤ 20 kg, au pas de 0,25 kg (C3). Un exercice ne se supprime jamais : il s'archive et se restaure (F-SEA-1).
- Séance : de 1 à 20 exercices, chacun une seule fois, et de 1 à 20 séries par exercice. Note facultative de 500 caractères maximum. Plusieurs séances le même jour sont autorisées (F-SEA-6).
- Vocabulaire du glossaire : « séance », « série », « charge », « répétitions », « échauffement », « fourchette cible », « pas d'augmentation ». Les libellés de matériel : Barre, Haltères, Machine, Poulie, Poids du corps, Autre.
- Toutes les données de l'interface passent par TanStack Query et l'API `/api/v1`. Aucun composant n'importe `@/db` ni `@/server`.

## Review Focus

1. **Virgule décimale du clavier iPhone** (`62,5`) : la charge enregistrée est 62,5 kg. Elle ne doit être ni refusée ni lue 625. Tests : tâche 2 (`parseDecimal`), tâche 8 (brouillon).
2. **Saisie tard le soir** : une séance saisie à 23 h 45 à Paris est datée du jour même, pas du lendemain (UTC). Test : tâche 2 (`todayIn`).
3. **Identifiant d'un autre utilisateur** dans l'URL ou dans le corps (`exerciseId` d'un exercice qui n'est pas le sien dans une séance) : 404, rien n'est écrit. Tests : tâches 4 et 5.
4. **L'app se ferme pendant la saisie** (iOS tue les PWA en arrière-plan) ou le réseau coupe à l'enregistrement : le brouillon de la séance n'est pas perdu, il est restauré à la réouverture, et l'erreur s'affiche avec un bouton pour réessayer. Tests : tâche 8.
5. **Exercice archivé** : il disparaît du sélecteur mais reste affiché, avec son nom, dans les séances passées et dans le préremplissage ; il ne peut pas être supprimé. Tests : tâches 4, 5 et 7.

---

## Structure des fichiers

```
packages/core/src/
  units/decimal.ts            parseDecimal, formatKg
  dates/calendar.ts           todayIn, addDays, startOfWeek, monthGrid
  training/equipment.ts       EQUIPMENT, equipmentLabel, defaultIncrementKg
  schemas/exercise.ts         exerciseInputSchema, exercisePatchSchema, type Exercise
  schemas/workout.ts          isoDateSchema, setInputSchema, workoutInputSchema, types Workout…
apps/web/
  scripts/migrate-on-deploy.ts      migrations en production uniquement
  scripts/e2e-prepare.ts            base PGlite e2e : migrations + propriétaire de test
  src/db/client.ts                  getDb() paresseux, pilote Neon ou PGlite selon l'URL
  src/db/schema/training.ts         exercise, workout, workout_exercise, workout_set
  src/server/http/read-json.ts      readJson(request, schema)
  src/server/http/errors.ts         + BadRequestError, ConflictError, UnsupportedMediaTypeError
  src/server/services/exercises.ts
  src/server/services/workouts.ts
  src/app/api/v1/exercises/route.ts, [id]/route.ts, [id]/last-sets/route.ts
  src/app/api/v1/workouts/route.ts, [id]/route.ts
  src/lib/api.ts                    apiFetch, ApiError
  src/lib/query-client.tsx          QueryProvider
  src/components/tab-bar.tsx, app-nav.tsx
  src/app/(app)/page.tsx            Cette semaine
  src/app/(app)/saisie/page.tsx     Saisie du soir (nouvelle séance)
  src/app/(app)/seances/[id]/page.tsx   séance passée (modifier, supprimer)
  src/app/(app)/seances/workout-editor.tsx, workout-draft.ts, exercise-picker.tsx
  src/app/(app)/exercices/page.tsx, nouveau/page.tsx, [id]/page.tsx, exercise-form.tsx
  src/app/(app)/calendrier/page.tsx, calendar-view.tsx
  src/app/(app)/plus/page.tsx
docs/adr/0010-pglite-pour-le-developpement-et-les-e2e.md
```

---

### Tâche 1 : Dette du Lot 0 et base locale séparée

Reprend les points mineurs du Lot 0 dont dépend ce lot. Le développement local et les e2e passent sur PGlite en fichier.

**Files :**
- Create : `src/server/http/read-json.ts`, `scripts/e2e-prepare.ts`, `scripts/migrate-on-deploy.ts`, `docs/adr/0010-pglite-pour-le-developpement-et-les-e2e.md`
- Modify : `src/db/client.ts`, `src/server/auth.ts`, `src/app/api/auth/[...all]/route.ts`, pages et layout qui utilisent `auth`, `src/server/http/errors.ts`, `src/server/http/api-handler.ts`, `src/proxy.ts`, `src/app/icons/[size]/route.tsx`, `src/server/create-owner.ts`, `src/env.ts`, `next.config.ts`, `package.json` (scripts `build`, `e2e:prepare`), `playwright.config.ts`, `.github/workflows/ci.yml`, `.githooks/pre-commit`, `docs/adr/0001-stack-technique.md`, `docs/adr/0009-base-de-donnees-dev-et-tests.md` (statut « remplacée en partie par 0010 »), `docs/plans/lot-0.md` (statut), `README.md`, `CLAUDE.md`
- Test : `tests/integration/read-json.test.ts`, `tests/integration/auth-origin.test.ts`, `tests/integration/env.test.ts`, `tests/integration/proxy.test.ts`, `tests/integration/icons.test.ts`, `tests/integration/create-owner.test.ts`, `e2e/connexion.spec.ts`

**Interfaces :**
- Produces :
  - `getDb(): AppDatabase`, création paresseuse et unique. `DATABASE_URL` commençant par `pglite:` ouvre une base PGlite dans le dossier indiqué (`pglite:./.data/dev`). Toute autre URL passe par Neon. `db` et `auth` ne sont plus créés à l'import : `getAuth(): Auth` remplace `auth`.
  - `readJson<T>(request: Request, schema: ZodType<T>): Promise<T>` lève `UnsupportedMediaTypeError` (415 `unsupported_media_type`) si `content-type` n'est pas JSON, `BadRequestError("invalid_json")` (400) si le corps ne se lit pas, et une `ZodError` (400 `invalid`) s'il ne respecte pas le schéma.
  - `ConflictError(code: string)` → 409 `{ error: code }`.
  - `pnpm --filter @maroutine/web e2e:prepare` recrée `./.data/e2e`, applique les migrations et crée le propriétaire de test `e2e@maroutine.test` / `e2e-mot-de-passe-solide`.
  - `pnpm build` = `tsx scripts/migrate-on-deploy.ts && next build`. Les migrations ne s'appliquent que si `VERCEL_ENV=production`, avec `DATABASE_URL_UNPOOLED` (à défaut `DATABASE_URL`).

- [ ] **Étape 1 : tests qui échouent**

```ts
// read-json.test.ts
it("refuse un corps non JSON : 415", ...);                 // content-type text/plain → UnsupportedMediaTypeError
it("refuse un JSON illisible : 400 invalid_json", ...);     // corps "{" → BadRequestError, code "invalid_json"
it("valide avec le schéma : ZodError", ...);
it("renvoie la valeur validée", ...);
// via apiHandler : les trois erreurs donnent 415, 400 { error: "invalid_json" }, 400 { error: "invalid" }
// et le journal d'une erreur 500 contient error.name.

// auth-origin.test.ts : createAuth avec advanced.disableOriginCheck: false (Better Auth coupe ce contrôle en test)
it("POST /sign-out avec une Origin étrangère et le cookie du propriétaire : 403", ...);
it("POST /sign-out depuis l'origine de l'app : 200", ...);

// env.test.ts
it("refuse une variable faite d'espaces", ...);             // DATABASE_URL: "   " → /DATABASE_URL/
// proxy.test.ts
it("/apixyz et /icons-test sont protégés, /api/v1/health et /icons/192 ne le sont pas", ...);
it("/robots.txt n'est pas redirigé", ...);
// icons.test.ts
it("/icons/constructor répond 404", ...);
// create-owner.test.ts
it("ne laisse aucune session après la création du propriétaire", ...);   // count(session) = 0
```

```ts
// e2e/connexion.spec.ts : sur la base PGlite e2e, enfin avec une vraie base
test("le propriétaire se connecte, voit « Cette semaine » et se déconnecte", ...);
test("un mauvais mot de passe affiche « Email ou mot de passe incorrect. »", ...);
```

- [ ] **Étape 2 : vérifier l'échec**

Run : `pnpm --filter @maroutine/web test` puis `pnpm --filter @maroutine/web test:e2e`
Expected : FAIL sur les nouveaux tests uniquement.

- [ ] **Étape 3 : implémenter**

- `getDb()` : pilote choisi selon le préfixe de l'URL. Ajouter `@electric-sql/pglite` aux dépendances (et plus seulement de développement), et l'inscrire dans `serverExternalPackages` de `next.config.ts`. Ne jamais envelopper le client dans un `Proxy` JavaScript.
- `getAuth()` : la route Better Auth devient `GET = (r) => getAuth().handler(r)`, et de même pour `POST`.
- `proxy.ts` : matcher dont chaque exclusion est ancrée (`api(?:/|$)`, `icons(?:/|$)`…), plus `robots.txt`.
- `icons` : contrôle avec `Object.hasOwn`. `createOwner` : instance d'inscription avec `autoSignIn: false`. `env` : valeurs passées par `trim()`.
- Playwright : `webServer.command` = `pnpm e2e:prepare && pnpm build && pnpm start --port 3100`, avec `DATABASE_URL=pglite:./.data/e2e`. `.data/` est ajouté au `.gitignore`.
- CI : actions épinglées par empreinte (SHA) avec la version en commentaire ; hook `gitleaks git --staged --redact`.
- Docs : ADR 0001 (ESLint 9.39.5, TanStack Query), statut du plan du Lot 0 « terminé », README et `CLAUDE.md` alignés (`DATABASE_URL_UNPOOLED` pour les migrations, `.env.local` avec `DATABASE_URL=pglite:./.data/dev` pour le développement). ADR 0010 : PGlite en fichier pour le développement et les e2e (pas de branche Neon, pas de Docker). Les migrations s'appliquent au build de production. Les aperçus Vercel partagent encore la base de production et n'exécutent pas de migration : ils ne servent qu'à regarder, jamais à saisir.

- [ ] **Étape 4 : vérifier le succès**

Run : `pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @maroutine/web test:e2e`
Expected : tout passe. `pnpm --filter @maroutine/web dev` démarre sur `pglite:./.data/dev` après `pnpm --filter @maroutine/web create-owner`.

- [ ] **Étape 5 : commit**

```bash
git commit -m "chore: pay lot 0 debt and move local dev and e2e to file pglite"
```

---

### Tâche 2 : `core` — décimales, dates, matériel

**Files :**
- Create : `packages/core/src/units/decimal.ts`, `dates/calendar.ts`, `training/equipment.ts` et leurs `.test.ts`
- Modify : `packages/core/src/index.ts`

**Interfaces :**
- Produces :
  - `parseDecimal(input: string): number | null` : accepte `,` ou `.`, les espaces autour et un signe absent. Rejette tout le reste (`null`).
  - `formatKg(value: number): string` : virgule française, sans zéros inutiles (`62.5` → `"62,5"`, `60` → `"60"`, `1.25` → `"1,25"`).
  - `todayIn(timeZone: string, now: Date): string` (`AAAA-MM-JJ`).
  - `addDays(date: string, days: number): string`.
  - `startOfWeek(date: string): string` (lundi).
  - `monthGrid(month: string): string[][]` (`"2026-11"` → semaines du lundi au dimanche qui couvrent tout le mois, jours des mois voisins inclus).
  - `EQUIPMENT = ["barbell", "dumbbell", "machine", "cable", "bodyweight", "other"] as const` et `type Equipment`.
  - `equipmentLabel(e: Equipment): string` (Barre, Haltères, Machine, Poulie, Poids du corps, Autre).
  - `defaultIncrementKg(e: Equipment): number` (barre 2,5 ; haltères 2 ; machine 5 ; poulie 2,5 ; poids du corps 2,5 ; autre 2,5).

- [ ] **Étape 1 : tests qui échouent**

```ts
expect(parseDecimal("62,5")).toBe(62.5);
expect(parseDecimal(" 62.5 ")).toBe(62.5);
expect(parseDecimal("70")).toBe(70);
expect(parseDecimal("")).toBeNull();
expect(parseDecimal("6,2,5")).toBeNull();
expect(parseDecimal("-5")).toBeNull();
expect(parseDecimal("abc")).toBeNull();
expect(formatKg(62.5)).toBe("62,5");
expect(formatKg(60)).toBe("60");
expect(formatKg(1.25)).toBe("1,25");
// 31 octobre 2026, 23 h 45 à Paris = 22 h 45 UTC (heure d'hiver) ; 31 mars 2026, 23 h 30 à Paris = 21 h 30 UTC (heure d'été)
expect(todayIn("Europe/Paris", new Date("2026-10-31T22:45:00Z"))).toBe("2026-10-31");
expect(todayIn("Europe/Paris", new Date("2026-03-31T21:30:00Z"))).toBe("2026-03-31");
expect(todayIn("Europe/Paris", new Date("2026-10-31T23:15:00Z"))).toBe("2026-11-01");
expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
expect(startOfWeek("2026-11-01")).toBe("2026-10-26");        // dimanche → lundi précédent
expect(startOfWeek("2026-10-26")).toBe("2026-10-26");
const grid = monthGrid("2026-11");
expect(grid[0]?.[0]).toBe("2026-10-26");
expect(grid.at(-1)?.at(-1)).toBe("2026-12-06");
expect(grid.every((w) => w.length === 7)).toBe(true);
expect(defaultIncrementKg("dumbbell")).toBe(2);
expect(equipmentLabel("bodyweight")).toBe("Poids du corps");
```

- [ ] **Étape 2 : vérifier l'échec** — Run : `pnpm --filter @maroutine/core test` → FAIL.

- [ ] **Étape 3 : implémenter**

Les dates se manipulent en UTC à partir de la chaîne `AAAA-MM-JJ`, jamais avec l'heure locale de la machine. `todayIn` passe par `Intl.DateTimeFormat("en-CA", { timeZone })`.

- [ ] **Étape 4 : vérifier le succès** — Run : `pnpm --filter @maroutine/core test` → PASS.

- [ ] **Étape 5 : commit** — `feat(core): add decimal parsing, calendar dates and equipment`

---

### Tâche 3 : `core` — schémas d'exercice et de séance

**Files :**
- Create : `packages/core/src/schemas/exercise.ts`, `schemas/workout.ts` et leurs tests
- Modify : `packages/core/src/index.ts`

**Interfaces :**
- Consumes : `EQUIPMENT` (tâche 2).
- Produces :
  - `exerciseInputSchema` → `{ name, equipment, repMin, repMax, incrementKg }`, avec les défauts `repMin` 6, `repMax` 10, et `incrementKg` égal à `defaultIncrementKg(equipment)` s'il est absent.
  - `exercisePatchSchema` → les mêmes champs, tous facultatifs, plus `archived?: boolean`. La cohérence `repMax ≥ repMin` est vérifiée par le service sur la valeur fusionnée.
  - `type Exercise = { id: string; name: string; equipment: Equipment; repMin: number; repMax: number; incrementKg: number; archived: boolean }`.
  - `isoDateSchema` (chaîne `AAAA-MM-JJ` d'une date réelle).
  - `setInputSchema` → `{ weightKg, reps, isWarmup }` (`isWarmup` vaut `false` par défaut).
  - `workoutInputSchema` → `{ performedOn, note?: string | null, exercises: { exerciseId: string; sets: SetInput[] }[] }`.
  - `type Workout = { id: string; performedOn: string; note: string | null; exercises: { exerciseId: string; name: string; archived: boolean; sets: SetInput[] }[] }`.
  - `type WorkoutSummary = { id: string; performedOn: string; exerciseCount: number; workingSetCount: number }`.
  - `type LastSets = { performedOn: string | null; sets: SetInput[] }`.

- [ ] **Étape 1 : tests qui échouent** (valeurs des Global Constraints)

```ts
expect(exerciseInputSchema.parse({ name: "  Développé couché ", equipment: "barbell" }))
  .toEqual({ name: "Développé couché", equipment: "barbell", repMin: 6, repMax: 10, incrementKg: 2.5 });
expect(exerciseInputSchema.parse({ name: "Curl", equipment: "dumbbell" }).incrementKg).toBe(2);
expect(exerciseInputSchema.safeParse({ name: "", equipment: "barbell" }).success).toBe(false);
expect(exerciseInputSchema.safeParse({ name: "x".repeat(61), equipment: "barbell" }).success).toBe(false);
expect(exerciseInputSchema.safeParse({ name: "A", equipment: "barbell", repMin: 10, repMax: 6 }).success).toBe(false);
expect(exerciseInputSchema.safeParse({ name: "A", equipment: "barbell", incrementKg: 0 }).success).toBe(false);
expect(exerciseInputSchema.safeParse({ name: "A", equipment: "barbell", incrementKg: 1.3 }).success).toBe(false);
expect(setInputSchema.safeParse({ weightKg: 62.5, reps: 8 }).success).toBe(true);
expect(setInputSchema.safeParse({ weightKg: 62.3, reps: 8 }).success).toBe(false);   // pas de 0,25
expect(setInputSchema.safeParse({ weightKg: 1000, reps: 8 }).success).toBe(false);
expect(setInputSchema.safeParse({ weightKg: 60, reps: 7.5 }).success).toBe(false);
expect(isoDateSchema.safeParse("2026-02-30").success).toBe(false);
expect(workoutInputSchema.safeParse(withExercises([])).success).toBe(false);          // au moins 1 exercice
expect(workoutInputSchema.safeParse(withSameExerciseTwice).success).toBe(false);
expect(workoutInputSchema.safeParse(withSets(21)).success).toBe(false);
```

- [ ] **Étape 2 : vérifier l'échec** — FAIL.
- [ ] **Étape 3 : implémenter** — Le pas de 0,25 se teste par `Math.round(v * 4) === v * 4`.
- [ ] **Étape 4 : vérifier le succès** — `pnpm --filter @maroutine/core test` → PASS.
- [ ] **Étape 5 : commit** — `feat(core): add exercise and workout schemas`

---

### Tâche 4 : Tables, migration et API des exercices

**Files :**
- Create : `src/db/schema/training.ts` (les quatre tables, exportées par `schema/index.ts`), la migration `drizzle/0001_training.sql` générée, `src/server/services/exercises.ts`, `src/app/api/v1/exercises/route.ts`, `src/app/api/v1/exercises/[id]/route.ts`
- Test : `tests/integration/exercises-api.test.ts`, `tests/helpers/api.ts`

**Interfaces :**
- Consumes : `getDb`, `readJson`, `ConflictError`, `NotFoundError`, `apiHandler` (tâche 1) ; `exerciseInputSchema`, `exercisePatchSchema`, `Exercise` (tâche 3).
- Produces :
  - Tables conformes à [architecture.md §7](../architecture.md#7-modèle-de-données), avec `numeric(…, { mode: "number" })` pour les charges (6,2) et le pas (5,2), et `date(…, { mode: "string" })` pour `performed_on`. Index unique `(user_id, lower(name))` sur `exercise`. Les contraintes `check` reprennent les bornes. `workout_exercise.exercise_id` est en `on delete restrict` ; les séances, exercices de séance et séries sont en `on delete cascade`.
  - Service :
    - `listExercises(db, userId, filter: "active" | "archived" | "all"): Promise<Exercise[]>`, trié par nom en français ;
    - `createExercise(db, userId, input): Promise<Exercise>` (`ConflictError("duplicate_name")`) ;
    - `getExercise(db, userId, id): Promise<Exercise>` (`NotFoundError`) ;
    - `updateExercise(db, userId, id, patch): Promise<Exercise>`.
  - Routes :
    - `GET /api/v1/exercises?filter=` (par défaut `active`) ;
    - `POST` → 201 ;
    - `GET` et `PATCH /api/v1/exercises/{id}`.
  - Aide de test `callRoute(handler, { method, url, body, session })`. Elle passe par `createApiHandler` avec une session fournie et une base `createTestDb()`. Chaque module de routes `/api/v1` expose donc aussi un constructeur `make<Nom>Routes(deps: { db: () => AppDatabase; apiHandler })`, qui renvoie ses méthodes. Les exports `GET`, `POST`… en sont l'instance de production. La tâche 5 suit le même modèle.

- [ ] **Étape 1 : tests qui échouent**

```ts
it("crée un exercice avec les valeurs par défaut : 201", ...);
it("refuse un doublon sans tenir compte de la casse : 409 duplicate_name", ...);   // « squat » après « Squat »
it("liste les exercices actifs triés, sans les archivés", ...);                    // « Développé couché » avant « Squat »
it("archive puis restaure un exercice", ...);
it("refuse une fourchette incohérente après fusion du PATCH : 400", ...);           // repMin: 12 sur 6–10
it("isolation (T-01) : l'exercice d'un autre utilisateur répond 404 en GET et en PATCH", ...);
it("isolation : la liste ne contient jamais les exercices d'un autre utilisateur", ...);
it("aucune route DELETE n'existe", ...);                                          // le module n'exporte pas DELETE
```

- [ ] **Étape 2 : vérifier l'échec** — FAIL.
- [ ] **Étape 3 : implémenter** — `pnpm db:generate --name training`, relire le SQL produit (T-12), puis écrire le service et les routes. L'erreur d'unicité PostgreSQL (`23505`) devient `ConflictError("duplicate_name")`.
- [ ] **Étape 4 : vérifier le succès** — `pnpm --filter @maroutine/web test` → PASS.
- [ ] **Étape 5 : commit** — `feat(api): add training tables and exercises api`

---

### Tâche 5 : API des séances et du préremplissage

**Files :**
- Create : `src/server/services/workouts.ts`, `src/app/api/v1/workouts/route.ts`, `src/app/api/v1/workouts/[id]/route.ts`, `src/app/api/v1/exercises/[id]/last-sets/route.ts`
- Test : `tests/integration/workouts-api.test.ts`

**Interfaces :**
- Consumes : tables et `callRoute` (tâche 4), `workoutInputSchema`, `Workout`, `WorkoutSummary`, `LastSets`, `isoDateSchema` (tâche 3).
- Produces :
  - Service :
    - `listWorkouts(db, userId, from, to): Promise<WorkoutSummary[]>`, triée par date puis par création ;
    - `createWorkout(db, userId, input): Promise<Workout>` ;
    - `getWorkout(db, userId, id): Promise<Workout>` ;
    - `replaceWorkout(db, userId, id, input): Promise<Workout>`, qui remplace exercices et séries dans une seule transaction ;
    - `deleteWorkout(db, userId, id): Promise<void>` ;
    - `lastSets(db, userId, exerciseId, before?: { performedOn: string; workoutId?: string }): Promise<LastSets>`.
  - Routes :
    - `GET /api/v1/workouts?from&to`, qui exige les deux dates sur au plus 400 jours ;
    - `POST` → 201 ;
    - `GET`, `PUT` et `DELETE /api/v1/workouts/{id}` (`DELETE` → 204) ;
    - `GET /api/v1/exercises/{id}/last-sets?before=AAAA-MM-JJ`.
  - « Dernière séance » = la séance la plus récente qui contient l'exercice, strictement avant la date `before` si elle est fournie. Sinon, la plus récente. Les séries renvoyées incluent les échauffements, dans l'ordre.

- [ ] **Étape 1 : tests qui échouent**

```ts
it("crée une séance complète et la relit à l'identique", ...);                     // ordre des exercices et des séries conservé
it("deux séances le même jour restent distinctes (F-SEA-6)", ...);
it("PUT remplace exercices et séries, sans laisser de série orpheline", ...);       // count(workout_set) cohérent
it("PUT qui échoue à mi-chemin ne modifie rien (transaction)", ...);                // exerciseId inconnu en 2e position → 404, séance inchangée
it("DELETE supprime la séance, ses exercices et ses séries : 204", ...);
it("isolation : séance d'un autre utilisateur → 404 en GET, PUT et DELETE", ...);
it("isolation : exerciseId d'un autre utilisateur dans le corps → 404 et rien n'est écrit (T-01)", ...);
it("un exercice archivé reste lisible dans les séances passées, avec son nom", ...);
it("listWorkouts compte les séries de travail sans les échauffements", ...);
it("last-sets renvoie les séries de la séance la plus récente de cet exercice", ...);
it("last-sets avec before ignore la séance du jour même et les suivantes", ...);
it("last-sets d'un exercice jamais fait : { performedOn: null, sets: [] }", ...);
it("GET /workouts sans from ou au-delà de 400 jours : 400", ...);
```

- [ ] **Étape 2 : vérifier l'échec** — FAIL.
- [ ] **Étape 3 : implémenter** — Avant toute écriture, vérifier que chaque `exerciseId` appartient à l'utilisateur (sinon `NotFoundError`). L'écriture d'une séance se fait dans `db.transaction`.
- [ ] **Étape 4 : vérifier le succès** — `pnpm --filter @maroutine/web test` → PASS.
- [ ] **Étape 5 : commit** — `feat(api): add workouts api and last sets prefill`

---

### Tâche 6 : Navigation de l'app, client d'API et contrat de direction

**Files :**
- Create : `src/lib/api.ts`, `src/lib/query-client.tsx`, `src/components/tab-bar.tsx`, `src/components/app-nav.tsx`, `src/app/(app)/plus/page.tsx`, brief de surface impeccable (`impeccable surface-brief write`)
- Modify : `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx` (déconnexion déplacée dans « Plus »)
- Test : `tests/integration/api-client.test.ts`, `tests/integration/tab-bar.test.tsx`

**Interfaces :**
- Produces :
  - `class ApiError extends Error { status: number; code: string }`.
  - `apiFetch<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T>`, qui envoie en JSON, lève `ApiError` sur un statut ≥ 400 et renvoie `undefined` sur 204.
  - `QueryProvider` (un `QueryClient` par session de navigateur, `retry: 1` en lecture, aucun retry en écriture).
  - `TabBar` (mobile, < 768 px) et `AppNav` (barre latérale ≥ 768 px), avec les entrées Semaine `/`, Saisie `/saisie`, Exercices `/exercices`, Plus `/plus`. L'entrée active porte `aria-current="page"`.
  - Page `/plus` : liens Calendrier et Se déconnecter.

Rendu : maquette A. Barre d'onglets blanche à filet `#D9E0E8`, actif en `#1F5FA8`, icônes en trait de 2 px (lucide). Sur ordinateur, barre latérale de 220 à 260 px, l'entrée active sur fond `#E3ECF7`. La barre d'onglets respecte `env(safe-area-inset-bottom)`.

- [ ] **Étape 1 : contrat de direction**

Écrire le brief de surface impeccable de l'app (mode Operate) avec les six blocs de `new-work.md` §5, tirés de la direction A choisie (signature : le couloir de tendance, qui arrive au Lot 2), et la ligne `seed: ed22938663351148`. Le relire.

- [ ] **Étape 2 : tests qui échouent**

```ts
it("apiFetch envoie du JSON et renvoie le corps", ...);
it("apiFetch lève ApiError(404, 'not_found')", ...);
it("apiFetch renvoie undefined sur 204", ...);
it("la barre d'onglets marque l'onglet courant", ...);       // usePathname "/exercices" → aria-current sur « Exercices »
```

- [ ] **Étape 3 : vérifier l'échec**, **Étape 4 : implémenter**, **Étape 5 : vérifier le succès** (`pnpm --filter @maroutine/web test`).
- [ ] **Étape 6 : commit** — `feat(web): add app navigation, api client and query provider`

---

### Tâche 7 : Écran Exercices

**Files :**
- Create : `src/app/(app)/exercices/page.tsx`, `nouveau/page.tsx`, `[id]/page.tsx`, `exercise-form.tsx`, `exercise-list.tsx`
- Test : `tests/integration/exercise-form.test.tsx`, `e2e/exercices.spec.ts`

**Interfaces :**
- Consumes : `apiFetch`, `QueryProvider` (tâche 6), routes exercices (tâche 4), `EQUIPMENT`, `equipmentLabel`, `defaultIncrementKg`, `parseDecimal`, `formatKg` (tâche 2).
- Produces :
  - `ExerciseForm({ initial?: Exercise; onSaved: (e: Exercise) => void })`, réutilisé par le sélecteur de la tâche 8.
  - Écran `/exercices` : liste des actifs (nom, matériel, fourchette) et lien « Nouvel exercice » ; section repliée « Archivés » avec un bouton « Restaurer ».
  - Écran `/exercices/[id]` : réglages et bouton « Archiver ». Les courbes viendront au Lot 2.

Formulaire : champ Nom, sélecteur Matériel (`<select>` natif, adapté à iOS). Changer de matériel met à jour le pas tant que l'utilisateur ne l'a pas modifié lui-même. Fourchette sur deux champs numériques (`inputmode="numeric"`), pas en `inputmode="decimal"`. Messages : « Ce nom existe déjà. » (409), « La fourchette doit aller d'un nombre au même ou à un plus grand. », « Le pas doit être un multiple de 0,25 kg. »

- [ ] **Étape 1 : tests qui échouent**

```ts
it("choisir Haltères propose un pas de 2 kg", ...);
it("un pas modifié à la main n'est plus écrasé par le matériel", ...);
it("« 1,25 » dans le pas est envoyé comme 1.25", ...);
it("affiche « Ce nom existe déjà. » sur un 409", ...);
```
```ts
// e2e/exercices.spec.ts (iphone et desktop)
test("créer, modifier, archiver puis restaurer un exercice", ...);
```

- [ ] **Étape 2 : vérifier l'échec**, **Étape 3 : implémenter**, **Étape 4 : vérifier le succès** (`test` et `test:e2e`).
- [ ] **Étape 5 : commit** — `feat(web): add exercises screens`

---

### Tâche 8 : Saisie du soir et édition d'une séance

**Files :**
- Create : `src/app/(app)/seances/workout-draft.ts`, `workout-editor.tsx`, `exercise-picker.tsx`, `src/app/(app)/saisie/page.tsx`, `src/app/(app)/seances/[id]/page.tsx`
- Test : `tests/integration/workout-draft.test.ts`, `tests/integration/workout-editor.test.tsx`, `e2e/saisie.spec.ts`

**Interfaces :**
- Consumes : `apiFetch` (tâche 6), routes séances et `last-sets` (tâche 5), `ExerciseForm` (tâche 7), `parseDecimal`, `formatKg`, `todayIn` (tâche 2), `workoutInputSchema` (tâche 3).
- Produces :
  - `type DraftSet = { key: string; weight: string; reps: string; isWarmup: boolean }` (texte saisi tel quel).
  - `type DraftExercise = { key: string; exerciseId: string; name: string; sets: DraftSet[] }`.
  - `type WorkoutDraft = { performedOn: string; note: string; exercises: DraftExercise[] }`.
  - `draftReducer(state: WorkoutDraft, action: DraftAction): WorkoutDraft`, avec les actions :
    - `setDate` ;
    - `addExercise { exercise: Pick<Exercise,"id"|"name">; lastSets: LastSets }` : préremplit avec les séries de la dernière fois, ou une série vide ;
    - `removeExercise`, `moveExercise { key; direction: "up" | "down" }` ;
    - `addSet` : copie la dernière série de l'exercice ;
    - `updateSet`, `removeSet`, `setNote` ;
    - `load { workout: Workout }`.
  - `toWorkoutInput(draft): { ok: true; input: WorkoutInput } | { ok: false; errors: Record<string, string> }` : les erreurs sont indexées par clé de série, avec les messages « Charge invalide » et « Répétitions invalides ».
  - `draftStorageKey(performedOn: string, workoutId?: string): string` : brouillon conservé dans `localStorage` (`maroutine:draft:<date>` ou `maroutine:draft:seance:<id>`). Il est enregistré à chaque modification, restauré à l'ouverture et effacé après un enregistrement réussi.
  - `WorkoutEditor({ mode: "create" | "edit"; workoutId?: string; initialDate: string })`.

Rendu, maquette A « Saisie du soir » :
- **En-tête** : titre « Saisie du soir » et bouton date (champ `type="date"` natif). La date par défaut est `todayIn("Europe/Paris", new Date())`.
- **Carte par exercice** : nom en gras, fourchette à droite, puis la grille `Série n | Charge (kg) | × | Répétitions` avec une case « Échauf. ».
- **Champs** : `inputmode="decimal"` pour la charge, `inputmode="numeric"` pour les répétitions, 44 px de haut, en 17 px pour éviter le zoom d'iOS.
- **Actions** : « + Ajouter une série », « + Ajouter un exercice » (sélecteur), et en bas un bouton fixe « Enregistrer la séance ».
- **En édition** : bouton « Supprimer la séance », avec confirmation par une `<dialog>` native.
- **Ligne d'information** sous chaque exercice prérempli : « Prérempli depuis le 30 oct. ». La suggestion du Lot 2 prendra cette place.

- [ ] **Étape 1 : tests qui échouent**

```ts
// workout-draft.test.ts
it("addExercise préremplit avec les séries de la dernière fois", ...);       // 65 × 6, 65 × 6, 65 × 5 → trois DraftSet "65"/"6"…
it("addExercise sans historique crée une série vide", ...);
it("addSet copie la dernière série", ...);
it("toWorkoutInput lit « 62,5 » comme 62.5 (Review Focus 1)", ...);
it("toWorkoutInput signale « Charge invalide » sur « 6,2,5 » avec la clé de la série", ...);
it("toWorkoutInput refuse une séance sans exercice", ...);
it("moveExercise réordonne et load reconstruit un brouillon depuis une séance", ...);
```
```tsx
// workout-editor.test.tsx (apiFetch simulé, localStorage de jsdom)
it("restaure le brouillon enregistré quand on rouvre l'écran (Review Focus 4)", ...);
it("sur une panne réseau à l'enregistrement : message « Enregistrement impossible. Réessaie. », brouillon conservé, bouton réactivé", ...);
it("après un enregistrement réussi, le brouillon est effacé et l'écran ouvre la séance", ...);
it("le sélecteur ne propose pas les exercices archivés", ...);
```
```ts
// e2e/saisie.spec.ts (iphone et desktop, base e2e)
test("saisie complète : 2 exercices, enregistrer, la séance apparaît dans « Cette semaine »", ...);
test("préremplissage : la séance suivante reprend les séries, on ne modifie qu'une série (NF-1)", ...);
test("modifier puis supprimer une séance passée", ...);
```

- [ ] **Étape 2 : vérifier l'échec**, **Étape 3 : implémenter**, **Étape 4 : vérifier le succès** (`test` et `test:e2e`).
- [ ] **Étape 5 : commit** — `feat(web): add evening workout entry and workout editing`

---

### Tâche 9 : Calendrier et semaine

**Files :**
- Create : `src/app/(app)/calendrier/page.tsx`, `calendar-view.tsx`, `src/app/(app)/week-summary.tsx`
- Modify : `src/app/(app)/page.tsx`
- Test : `tests/integration/calendar-view.test.tsx`, `e2e/calendrier.spec.ts`

**Interfaces :**
- Consumes : `GET /api/v1/workouts?from&to` (tâche 5), `monthGrid`, `startOfWeek`, `addDays`, `todayIn` (tâche 2), `apiFetch` (tâche 6).
- Produces :
  - `/calendrier?mois=AAAA-MM` : grille du mois, du lundi au dimanche, avec ses boutons mois précédent et suivant. Un jour de séance porte une pastille `#1F5FA8`, et chaque semaine affiche son nombre de séances à droite. Toucher un jour liste ses séances, chacune avec un lien vers `/seances/[id]`. Un mois sans séance affiche « Aucune séance ce mois-ci. ».
  - `/` « Cette semaine » : nombre de séances de la semaine en cours, liste des séances (date, nombre d'exercices et de séries de travail) avec liens, et lien « Saisie du soir ». Une semaine vide affiche « Pas encore de séance cette semaine. » et le même lien.
  - Chaque grille a un équivalent textuel (`aria-label` de la forme « 3 séances la semaine du 26 octobre »), selon NF-8.

- [ ] **Étape 1 : tests qui échouent**

```tsx
it("marque les jours de séance et compte les séances par semaine", ...);   // séances les 26, 28 et 30 oct. → « 3 » sur la ligne du 26
it("deux séances le même jour donnent un jour marqué et 2 dans le total de la semaine", ...);
it("un mois vide affiche « Aucune séance ce mois-ci. »", ...);
it("la navigation passe de novembre 2026 à décembre 2026 puis à janvier 2027", ...);
```
```ts
test("la séance saisie apparaît dans le calendrier et s'ouvre", ...);
test("aucune violation axe sur Semaine, Saisie, Exercices et Calendrier", ...);
```

- [ ] **Étape 2 : vérifier l'échec**, **Étape 3 : implémenter**, **Étape 4 : vérifier le succès** (`test` et `test:e2e`).
- [ ] **Étape 5 : commit** — `feat(web): add calendar and week summary`

---

### Tâche 10 : Finition design, déploiement et critère de fin

**Files :**
- Create : `DESIGN.md` et `.impeccable/design.json` (via le documenteur impeccable)
- Modify : `CLAUDE.md`, `docs/plans/lot-1.md` (statut)

- [ ] **Étape 1 : détecteur et revue de design**

`impeccable detect --json` sur les fichiers d'interface modifiés : corriger ce qui est mécanique. Prendre des captures `desktop.png` (1440) et `mobile.png` (390) de Saisie, Exercices et Calendrier dans `.impeccable/review/`. Faire ensuite la revue de finition impeccable par un relecteur neuf, à partir de `degraded/finish-reviewer.md` de la skill, avec le brief de surface et la maquette A comme référence. Puis faire écrire `DESIGN.md` par le documenteur (`degraded/documenter.md`), à partir de ce qui est réellement construit.

- [ ] **Étape 2 : fusion et déploiement**

PR `lot-1` → `main`, CI verte, fusion. Le build de production applique la migration `0001_training` (vérifier dans les journaux de build Vercel la ligne des migrations appliquées), puis `GET /api/v1/health` répond `ok`.

- [ ] **Étape 3 : critère de fin sur iPhone (propriétaire)**

Créer 5 exercices, saisir une séance, en saisir une seconde le lendemain (ou à une date passée) et constater le préremplissage. Retrouver les deux dans le calendrier, en corriger une, en supprimer une autre. Chronométrer la seconde saisie (NF-1 : moins de 2 minutes pour 5 exercices × 4 séries).

- [ ] **Étape 4 : documentation et commit**

`CLAUDE.md` : état « Lot 1 terminé », nouvelles commandes, lien vers `DESIGN.md`. Statut de ce plan : « terminé ».

```bash
git commit -m "docs: record lot 1 completion and design system"
```
