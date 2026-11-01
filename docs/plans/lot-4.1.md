# Lot 4.1 : retours du propriétaire — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Statut : terminé** (PR #7). Validé le 01/11/2026 (« Parfait »), avec un ajout : retirer le nombre de séries de l'accueil. Exécution déléguée, mêmes étapes que les lots 3 et 4.

**Goal :** appliquer les retours du propriétaire du 01/11/2026, avant le Lot 5 :
- chaque exercice appartient à un groupe musculaire, et « Bras » se sépare en Biceps et Triceps ;
- la séance commence par le choix des muscles travaillés, qui filtrent les exercices proposés ;
- l'onglet Poids prend la place d'Exercices, qui passe dans « Plus » ;
- une nouvelle séance enregistrée ramène à l'accueil ;
- l'accueil n'affiche plus le nombre de séries de travail des séances ;
- un aliment s'ajoute en scannant son code-barres.

**Hors lot (reporté par le propriétaire) :** afficher les muscles travaillés dans le calendrier, peut-être avec des icônes. Ce lot enregistre déjà ces muscles sur chaque séance, et l'API les renvoie dans le résumé des séances, pour que l'affichage puisse venir sans migration.

**Architecture :**
- Les groupes musculaires, leur ordre, le catalogue redécoupé et la validation des codes-barres sont des fonctions pures de `packages/core`.
- La migration additive `0005` ajoute deux colonnes :
  - `exercise.muscle_group`, nullable. Les exercices existants dont le nom est celui d'une entrée du catalogue reçoivent son groupe, et les autres restent « Non classés ».
  - `workout.muscle_groups`, une liste de texte, vide par défaut.
- Le scan lit le code-barres dans le navigateur. Le serveur cherche ensuite le produit dans son cache `food`, puis dans l'API produit d'Open Food Facts, avec les mêmes garde-fous que la recherche ([ADR 0007](../adr/0007-alimentation-open-food-facts.md)).

**Tech Stack :** celle du Lot 4, plus `barcode-detector@3.2.3` (MIT). C'est l'API standard BarcodeDetector, que Safari sur iPhone n'a pas, réimplémentée avec ZXing en WebAssembly. Le fichier `.wasm` est servi par l'app elle-même, sans CDN.

**Spec :**
- [SPEC.md](../SPEC.md) F-SEA, F-ALI ;
- [ADR 0007](../adr/0007-alimentation-open-food-facts.md) ;
- décisions du propriétaire du 01/11/2026 : 7 groupes musculaires (Pectoraux, Dos, Épaules, Biceps, Triceps, Jambes, Abdominaux), affichage dans le calendrier reporté.

## Global Constraints

- Toutes celles du [Lot 4](lot-4.md#global-constraints).
- **Groupes musculaires**, dans cet ordre : `chest` Pectoraux, `back` Dos, `shoulders` Épaules, `biceps` Biceps, `triceps` Triceps, `legs` Jambes, `abs` Abdominaux. `arms` disparaît.
- **Catalogue** :
  - les 4 curls passent en `biceps` ;
  - « Extension triceps à la poulie », « Barre au front » et « Extension triceps au-dessus de la tête » passent en `triceps` ;
  - « Dips » reste en Pectoraux.
- **Groupe d'un exercice** :
  - tout nouvel exercice en a un : `muscleGroup` est obligatoire à la création, dans l'API comme dans le formulaire ;
  - un exercice existant peut rester sans groupe (« Non classé ») jusqu'à ce que le propriétaire le règle.
- **Muscles d'une séance** :
  - de 0 à 7 groupes, sans doublon, renvoyés dans l'ordre ci-dessus ;
  - ajouter à la séance un exercice d'un groupe non choisi ajoute ce groupe. Retirer l'exercice ne retire pas le groupe.
- **Filtre de l'ajout d'exercice dans la séance**, quand au moins un muscle est choisi :
  - « Tes exercices » ne montre que ceux des muscles choisis, puis un bouton « Voir tous mes exercices » ;
  - le catalogue ne montre que les sections des muscles choisis ;
  - une recherche porte sur tout, sans tenir compte du filtre.
- **Navigation** : Accueil, Séance, Repas, Poids, Plus. « Plus » couvre `/calendrier`, `/exercices`, `/objectifs` et `/aliments`.
- **Après enregistrement** :
  - une nouvelle séance ramène à l'accueil (`/`), qui affiche « Séance enregistrée. » ;
  - la modification d'une séance passée reste sur place, comme aujourd'hui.
- **Accueil** : les séances de « Cette semaine » et du détail d'un jour du calendrier d'activité n'affichent plus que le nombre d'exercices (et l'échauffement et le cardio, comme aujourd'hui), sans le nombre de séries de travail. L'écran Calendrier, sous « Plus », garde le nombre de séries.
- **Codes-barres acceptés** : EAN-13, EAN-8 et UPC-A, avec une clé de contrôle GS1 valide. Un UPC-A (12 chiffres) est complété d'un 0 en tête, comme dans Open Food Facts.
- **Recherche par code-barres côté serveur** :
  - le cache `food` est consulté d'abord, sans appel externe ;
  - sinon, appel à `https://world.openfoodfacts.org/api/v2/product/{code}?fields=code,product_name,product_name_fr,brands,nutriments`, avec le même `User-Agent` et le même délai de 3 s ;
  - limite de 20 codes par minute et par utilisateur, en mémoire. La limite publiée par Open Food Facts est de 100 lectures de produit par minute ;
  - compte démo : 403 ;
  - `OPEN_FOOD_FACTS=off` coupe l'appel externe.
- **Sécurité** :
  - `Permissions-Policy` passe de `camera=()` à `camera=(self)` ;
  - la CSP de production ajoute `'wasm-unsafe-eval'` à `script-src` ;
  - aucune autre origine n'est ajoutée ;
  - aucune image de la caméra ne quitte l'appareil, seul le code lu est envoyé.

## Review Focus

1. **Brouillon de séance enregistré avant ce lot** (localStorage, sans `muscleGroups`) et rouvert : il se restaure avec une liste vide, sans erreur. Test : tâche 4.
2. **Code-barres lu de travers** : 13 chiffres avec une mauvaise clé, 12 chiffres, ou des espaces dans la saisie manuelle. Aucun appel externe pour un code invalide, et un UPC-A trouve le produit stocké en EAN-13. Tests : tâches 1 et 6.
3. **Caméra refusée, absente, ou app ouverte hors HTTPS** : un message clair et la saisie manuelle du code, jamais d'écran figé. Quitter l'écran coupe la caméra (le témoin vert de l'iPhone s'éteint). Test : tâche 7.
4. **Exercice existant au nom proche du catalogue** (« squat » contre « Squat », « Curl barre EZ ») : seul le nom exact, sans tenir compte de la casse, reçoit un groupe ; les autres restent « Non classés ». Test : tâche 2.
5. **Écrans gardés montés (Activity)** : après « Enregistrer », l'éditeur caché repart d'une saisie vide, muscles compris, et le message « Séance enregistrée. » de l'accueil disparaît après navigation. Tests : tâches 4 et 5.

---

### Tâche 1 : `core` — groupes musculaires, catalogue et codes-barres

**Files :**
- `packages/core/src/training/catalog.ts` (+ test) ;
- `schemas/exercise.ts` et `schemas/workout.ts` (+ tests) ;
- nouveau `nutrition/barcode.ts` (+ test) ;
- `index.ts`.

**Interfaces — Produces :**
- `MUSCLE_GROUPS = ["chest","back","shoulders","biceps","triceps","legs","abs"]`, avec `MuscleGroup` et `muscleGroupLabel`.
- `sortMuscleGroups(groups: readonly MuscleGroup[]): MuscleGroup[]` : sans doublon, dans l'ordre de `MUSCLE_GROUPS`.
- `withMuscleGroup(groups, group: MuscleGroup | null): MuscleGroup[]` : ajoute le groupe s'il manque, et ne change rien pour `null`.
- `exerciseInputSchema` :
  - ajoute `muscleGroup: z.enum(MUSCLE_GROUPS)`, obligatoire ;
  - `exercisePatchSchema` ajoute `muscleGroup` facultatif ;
  - le type `Exercise` ajoute `muscleGroup: MuscleGroup | null`.
- `workoutInputSchema` :
  - ajoute `muscleGroups: z.array(z.enum(MUSCLE_GROUPS)).max(7).default([])`, transformé par `sortMuscleGroups` ;
  - `Workout` et `WorkoutSummary` ajoutent `muscleGroups: MuscleGroup[]`.
- `normalizeBarcode(raw: string): string | null` : retire les espaces, accepte 8, 12 ou 13 chiffres avec une clé GS1 valide, et renvoie 13 chiffres pour un UPC-A.

**Tests (RED d'abord) :**
- le catalogue a toujours 40 entrées aux noms uniques ;
- aucune entrée `arms` ;
- 4 entrées `biceps` et 3 `triceps` ;
- `sortMuscleGroups(["abs","chest","abs"])` donne `["chest","abs"]` ;
- `withMuscleGroup(["chest"], "triceps")` donne `["chest","triceps"]`, et `withMuscleGroup(g, null)` renvoie `g` ;
- `exerciseInputSchema` refuse un exercice sans `muscleGroup`, ainsi que `"arms"` ;
- `workoutInputSchema` :
  - sans `muscleGroups`, renvoie `[]` ;
  - `["triceps","shoulders"]` donne `["shoulders","triceps"]` ;
  - un groupe inconnu est refusé ;
- `normalizeBarcode` :
  - `"3017620422003"` (Nutella) est accepté tel quel ;
  - `"3017620422004"` donne `null` ;
  - `" 3017 6204 22003 "` donne `"3017620422003"` ;
  - `"96385074"` (EAN-8 valide) est accepté ;
  - `"036000291452"` (UPC-A) donne `"0036000291452"` ;
  - `"abc"`, `""` et 14 chiffres donnent `null`.

- [ ] Tests RED, implémentation, `pnpm --filter @maroutine/core test` vert, commit `feat(core): groupes musculaires, biceps et triceps, codes-barres`.

### Tâche 2 : base et API — groupe de l'exercice, muscles de la séance

**Files :**
- `apps/web/src/db/schema/training.ts` ;
- `drizzle/0005_muscle_groups.sql` : généré par `db:generate`, puis complété à la main du rattrapage ;
- `server/services/exercises.ts`, `server/services/workouts.ts` et leurs routes ;
- tests `exercises-api`, `exercises-batch`, `workouts-api`, `migrations`.

**Interfaces — Produces :**
- `exercise.muscle_group text null`, avec un check sur les 7 valeurs.
- `workout.muscle_groups text[] not null default '{}'`, avec le check `muscle_groups <@ array[...]::text[]`.
- Rattrapage dans la migration : `update exercise set muscle_group = c.grp from (values ('développé couché','chest'), …) c(name, grp) where lower(exercise.name) = c.name`, avec les 40 entrées du catalogue.
- `GET /exercises` et `GET /exercises/{id}` renvoient `muscleGroup`.
- `POST`, `PATCH` et `batch` l'acceptent.
- `GET /workouts` (résumé) et `GET /workouts/{id}` renvoient `muscleGroups`, et `POST` et `PUT` l'enregistrent.

**Tests :**
- **migrations** :
  - après `0004` puis `0005`, un exercice « squat » reçoit `legs`, « Curl barre » reçoit `biceps`, et « Curl barre EZ » reste `null` ;
  - une séance existante a `muscle_groups = {}` ;
  - les 40 paires du `values` de la migration sont exactement celles d'`EXERCISE_CATALOG` : le test lit le fichier SQL et compare.
- **exercises-api** :
  - `POST` sans `muscleGroup` renvoie 400 ;
  - `PATCH {muscleGroup:"triceps"}` renvoie 200, et le `GET` le montre ;
  - un exercice d'un autre utilisateur renvoie 404 ;
  - le compte démo reçoit 403.
- **workouts-api** :
  - `POST` avec `muscleGroups:["triceps","shoulders"]` donne `["shoulders","triceps"]` dans le détail et dans le résumé ;
  - `PUT` avec `[]` les vide ;
  - `["arms"]` renvoie 400.

- [ ] Tests RED, schéma, migration, services, `pnpm --filter @maroutine/web test` vert, commit `feat(web): groupe des exercices et muscles des séances (migration 0005)`.

### Tâche 3 : écrans Exercices — groupe à la création, au réglage et filtre

**Files :**
- `exercices/exercise-form.tsx` ;
- `exercices/[id]/reglages/exercise-settings.tsx` ;
- `exercices/exercise-list.tsx` ;
- `exercices/catalogue/catalog-picker.tsx` ;
- tests `exercise-form`, `catalog-picker`, et un nouveau `exercise-list`.

**Interfaces :**
- `ExerciseForm` prend `defaultMuscleGroup?: MuscleGroup` et affiche un choix « Muscle » obligatoire, sans valeur par défaut hors séance.
- Les réglages proposent le même choix, plus « Non classé » s'il n'y a pas encore de groupe. Une fois réglé, on ne peut plus revenir à « Non classé ».
- La liste Exercices :
  - affiche une rangée de filtres : « Tous », puis chaque groupe qui a au moins un exercice, puis « Non classés » s'il y en a ;
  - les filtres sont des boutons `aria-pressed`, avec « Tous » choisi par défaut ;
  - les tendances du Lot 2 restent affichées.
- Le catalogue envoie `muscleGroup: entry.group` à l'ajout par lot.

**Tests :**
- le formulaire refuse l'envoi sans muscle (« Choisis un muscle. ») et envoie le groupe choisi ;
- le filtre « Triceps » ne montre que les exercices triceps, et « Non classés » ceux sans groupe ;
- le catalogue :
  - affiche les sections Biceps et Triceps ;
  - n'affiche plus de section Bras ;
  - envoie le groupe de chaque entrée cochée.

- [ ] Tests RED, implémentation, suite web verte, commit `feat(web): muscle des exercices, filtre de la liste`.

### Tâche 4 : séance — muscles travaillés, filtre et retour à l'accueil

**Files :**
- `seances/workout-draft.ts` ;
- `seances/workout-editor.tsx` ;
- `seances/exercise-picker.tsx` ;
- `app/(app)/home-screen.tsx` ;
- tests `workout-draft`, `workout-editor`, et e2e `saisie.spec.ts`.

**Interfaces :**
- `WorkoutDraft` ajoute `muscleGroups: MuscleGroup[]`.
- Actions du brouillon :
  - `toggleMuscleGroup` ajoute ou retire un groupe ;
  - `addExercise` applique `withMuscleGroup` avec le groupe de l'exercice ajouté ;
  - un brouillon restauré sans `muscleGroups` reçoit `[]`.
- `toWorkoutInput` envoie `muscleGroups`.
- L'éditeur :
  - sous la date, un bloc « Muscles travaillés » avec 7 boutons `aria-pressed`, en tête de la séance ;
  - le bloc n'est pas obligatoire.
- `ExercisePicker` :
  - prend `muscleGroups: MuscleGroup[]` et applique le filtre des Global Constraints ;
  - « Créer un exercice » préremplit le muscle avec le premier groupe choisi.
- Enregistrement en création :
  - `resetTo(emptyDraft(...))`, puis `router.push("/?enregistree=1")` ;
  - l'accueil affiche « Séance enregistrée. » dans une région `role="status"`, puis retire le paramètre avec `router.replace("/")` ;
  - la modification d'une séance passée ne change pas.

**Tests :**
- **workout-draft** :
  - ajouter un exercice triceps à `["shoulders"]` donne `["shoulders","triceps"]` ;
  - retirer l'exercice garde les deux groupes ;
  - un brouillon JSON sans le champ se restaure avec `[]`.
- **workout-editor** :
  - choisir « Épaules » limite « Tes exercices » aux épaules ;
  - « Voir tous mes exercices » montre les autres ;
  - une recherche trouve un exercice de Jambes ;
  - après l'enregistrement d'une nouvelle séance, le routeur reçoit `/?enregistree=1` et l'éditeur repart vide, muscles compris.
- **e2e saisie** :
  - choisir Épaules et Triceps ;
  - ajouter un exercice ;
  - enregistrer ;
  - on arrive sur l'accueil avec « Séance enregistrée. ».

- [ ] Tests RED, implémentation, suite web verte, commit `feat(web): muscles travaillés de la séance, retour à l'accueil`.

### Tâche 5 : navigation et accueil — Poids en onglet, Exercices dans « Plus », sans séries

**Files :**
- `components/nav-items.ts` ;
- `app/(app)/plus/page.tsx` ;
- `calendrier/calendar-view.tsx` (`WorkoutLink`), `home-screen.tsx`, `activity-calendar.tsx` ;
- tests `tab-bar`, `activity-calendar`, `calendar-view`, e2e `exercices.spec.ts`, `poids.spec.ts`, `fiche.spec.ts` (les accès passent par « Plus »).

**Interfaces :**
- `NAV_ITEMS` devient Accueil, Séance, Repas, `{ href: "/poids", label: "Poids", icon: Weight }`, puis Plus.
- `covers` de Plus : `["/calendrier", "/exercices", "/objectifs", "/aliments"]`.
- `LINKS` de « Plus » : « Exercices » remplace « Poids ».
- `WorkoutLink` prend `showSets?: boolean`, `true` par défaut. L'accueil (« Cette semaine » et `ActivityCalendar`) passe `false`.

**Tests :**
- l'onglet Poids est actif sur `/poids` ;
- « Plus » est actif sur `/exercices` et `/exercices/{id}/reglages` ;
- il y a toujours 5 onglets ;
- le détail d'un jour du calendrier d'activité n'affiche pas « séries de travail », alors que celui de l'écran Calendrier l'affiche ;
- la boucle axe de `calendrier.spec.ts` passe toujours.

- [ ] Tests RED, implémentation, suite web et e2e concernés verts, commit `feat(web): onglet Poids, Exercices dans Plus, accueil sans séries`.

### Tâche 6 : serveur — aliment par code-barres

**Files :**
- `server/off-client.ts` ;
- `server/services/foods.ts` ;
- `server/routes/foods.ts` ;
- `app/api/v1/foods/barcode/[code]/route.ts` ;
- test `foods-api`.

**Interfaces — Produces :**
- `fetchOpenFoodFactsProduct(code: string, signal: AbortSignal): Promise<OffHit | null>` : `null` sur un 404 ou un `status: 0` d'Open Food Facts. Le produit passe par `parseOffHit`, déjà existant.
- `foodByBarcode(db, userId, code): Promise<FoodResult>` :
  - cherche d'abord le cache, `food` avec `source = 'off'` et `off_code = code` ;
  - sinon appelle Open Food Facts et met le produit en cache par upsert, comme la recherche.
- `makeFoodBarcodeRoutes(deps, fetchProduct = fetchOpenFoodFactsProduct, timeoutMs = 3000)`, monté sur `GET /api/v1/foods/barcode/{code}`. Réponses :
  - **200** : un `FoodResult` ;
  - **400 `invalid_barcode`** : le code ne passe pas `normalizeBarcode` ;
  - **404 `not_found`** : produit inconnu, ou produit sans kcal ni protéines exploitables ;
  - **429 `rate_limited`** : plus de 20 codes par minute ;
  - **503 `off_unavailable`** : délai dépassé, erreur réseau, ou `OPEN_FOOD_FACTS=off` sans produit en cache ;
  - **403** : compte démo.

**Tests (client Open Food Facts injecté) :**
- un code en cache répond sans appeler le client ;
- `036000291452` cherche `0036000291452` ;
- un code à mauvaise clé renvoie 400, sans appel ;
- un produit inconnu renvoie 404 ;
- un client qui dépasse 3 s renvoie 503 ;
- le 21e code de la minute renvoie 429 ;
- le compte démo reçoit 403 ;
- un deuxième utilisateur qui scanne un produit déjà en cache n'appelle pas Open Food Facts : le cache est partagé, comme pour la recherche.

- [ ] Tests RED, implémentation, suite web verte, commit `feat(web): aliment par code-barres (Open Food Facts, cache)`.

### Tâche 7 : écran d'ajout — scanner

**Files :**
- `apps/web/package.json` : `barcode-detector` 3.2.3, version exacte ;
- `scripts/copy-zxing-wasm.ts` : copie `zxing_reader.wasm` de `node_modules/zxing-wasm/dist/reader/` vers `public/zxing/`, qui est ignoré par git. Le script est lancé avant `dev`, `build` et le build e2e ;
- `next.config.ts` (CSP et `Permissions-Policy`) ;
- `alimentation/ajouter/barcode-scanner.tsx` ;
- `alimentation/ajouter/add-entry.tsx` ;
- tests `add-entry` et `barcode-scanner`, e2e `alimentation.spec.ts`, plus un test des en-têtes.

**Interfaces :**
- `BarcodeScanner({ onCode: (code: string) => void, onClose })` :
  - importe `barcode-detector/ponyfill` dynamiquement, à l'ouverture seulement ;
  - `prepareZXingModule` avec `locateFile` vers `/zxing/` ;
  - `getUserMedia({ video: { facingMode: "environment" } })`, puis une détection toutes les 250 ms, limitée aux formats `ean_13`, `ean_8` et `upc_a` ;
  - le premier code valide selon `normalizeBarcode` coupe le flux, en arrêtant toutes les pistes, et appelle `onCode` ;
  - le flux est aussi coupé au démontage et sur « Fermer » ;
  - sans caméra, ou si l'accès est refusé : « Caméra indisponible. Saisis le code écrit sous les barres. » et le champ manuel.
- `AddEntry` :
  - un bouton « Scanner » à côté de la recherche, et un lien « Saisir le code » pour la saisie manuelle ;
  - un code trouvé ouvre `QuantityForm`, comme un résultat de recherche ;
  - 404 : « Produit introuvable sur Open Food Facts. » avec « Ajout rapide » et « Créer l'aliment » ;
  - 503 : « Open Food Facts ne répond pas. Réessaie ou saisis l'aliment. »

**Tests :**
- **barcode-scanner** (détecteur et `getUserMedia` simulés) :
  - un code lu appelle `onCode` une seule fois et arrête les pistes ;
  - un démontage arrête les pistes ;
  - un refus (`NotAllowedError`) affiche le message et le champ manuel.
- **add-entry** :
  - un code saisi à la main ouvre la quantité du produit renvoyé ;
  - 404 affiche les deux issues ;
  - un code invalide est refusé avant l'envoi (« Code-barres invalide. »).
- **En-têtes** : la configuration de production contient `camera=(self)` et `'wasm-unsafe-eval'`.
- **e2e** (`OPEN_FOOD_FACTS=off`) : « Saisir le code », puis 3017620422003, affiche « Open Food Facts ne répond pas » ; la page passe axe.

- [ ] Tests RED, implémentation, suite web et e2e verts, commit `feat(web): scanner de code-barres à l'ajout d'un aliment`.

### Tâche 8 : documentation et clôture

**Files :**
- `docs/decisions-ouvertes.md` :
  - D27 : groupes musculaires et Biceps/Triceps ;
  - D28 : muscles de la séance, filtre et retour à l'accueil ;
  - D29 : scan par code-barres et ponyfill ZXing auto-hébergé ;
  - D30 : onglet Poids ;
- `docs/SPEC.md` : table API, `GET /foods/barcode/{code}` ;
- `docs/architecture.md` : modèle de données et écrans ;
- `docs/GLOSSARY.md` : « groupe musculaire », « muscles travaillés », « code-barres » ;
- `docs/threat-model.md` : caméra, aucune image envoyée ;
- [ADR 0007](../adr/0007-alimentation-open-food-facts.md) : API produit et ses limites ;
- `apps/web/DESIGN.md` : barre d'onglets ;
- `.env.example`, si une variable change ;
- `CLAUDE.md` : état du Lot 4.1 ;
- ce plan, passé à « terminé ».

- [ ] Lint, types, tests et e2e verts. Revue finale par un sous-agent opus. PR `lot-4.1`, CI verte, fusion, vérification en production : la migration `0005` est appliquée, la route `foods/barcode` renvoie 401 sans session, et l'en-tête `Permissions-Policy` vaut `camera=(self)`.

## Recette du propriétaire sur iPhone

1. Dans Exercices (sous « Plus »), donner un muscle aux exercices « Non classés ».
2. Commencer une séance par Épaules et Triceps, et vérifier que l'ajout d'exercice ne propose qu'eux.
3. Enregistrer la séance, et vérifier qu'on arrive sur l'accueil.
4. Dans Repas → Ajouter, scanner un vrai produit. iOS demande l'accès à la caméra au premier scan.
