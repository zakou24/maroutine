# Lot 4 : alimentation — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Statut : en cours** (branche `lot-4`). Rédaction et exécution déléguées par le propriétaire le 01/11/2026 (« C'est parti pour le lot 4, suis les mêmes étapes »).

**Goal :** noter ce qu'on mange chaque jour, avec les calories et les protéines de chaque entrée, et voir sa journée par rapport à ses objectifs. Les entrées viennent de trois sources : Open Food Facts, les aliments perso et l'ajout rapide.

**Architecture :**
- Trois tables (`food`, `food_entry`, `nutrition_target`), créées par la migration additive `0004`.
- Les calculs (valeurs d'une entrée, totaux d'une journée, objectif en vigueur) et la validation des produits Open Food Facts sont des fonctions pures de `packages/core`.
- La recherche appelle Open Food Facts côté serveur, avec un `User-Agent` identifié, un délai de 3 s, une limite par utilisateur et un cache dans `food` ([ADR 0007](../adr/0007-alimentation-open-food-facts.md)).
- Une entrée fige ses calories et ses protéines à l'enregistrement.

**Tech Stack :** celle du Lot 3, sans nouvelle dépendance. Open Food Facts est un service gratuit et sans clé.

**Spec :**
- [SPEC.md](../SPEC.md) : F-ALI-1 à F-ALI-7, NF-10, API « Aliments », « Journal » et « Objectifs », F-DEM-3 (la recherche est refusée au compte démo) ;
- [architecture.md](../architecture.md) §5 (séquence de recherche), §6.7 (objectif en vigueur), §7 (modèle) et §8 (écrans Alimentation et Réglages) ;
- [decisions-ouvertes.md](../decisions-ouvertes.md) C6, C7, C8, C13 ;
- [threat-model.md](../threat-model.md) T-01, T-02, T-08, T-09 et T-11.

## Global Constraints

- Toutes celles du [Lot 3](lot-3.md#global-constraints).
- **Open Food Facts** (vérifié le 01/11/2026 sur la documentation officielle) :
  - recherche plein texte par Search-a-licious : `https://search.openfoodfacts.org/search?q=…&langs=fr&page_size=20&fields=code,product_name,product_name_fr,brands,nutriments` ;
  - limite publiée : 10 recherches par minute et par IP ;
  - en-tête `User-Agent: MaRoutine/1.0 (https://github.com/zakou24/maroutine)`.
- **Recherche (§5, F-ALI-2) :**
  - d'abord les aliments perso de l'utilisateur, puis les aliments récemment utilisés, puis les aliments d'Open Food Facts ;
  - l'appel externe n'a lieu que s'il y a moins de 10 résultats locaux ;
  - au-delà de 3 s ou en cas d'erreur, seuls les résultats locaux reviennent, avec `offUnavailable: true` ;
  - au plus 6 appels externes par minute et par utilisateur ; au-delà, seulement les résultats locaux ;
  - la requête fait au moins 2 caractères, et l'interface attend 400 ms après la frappe avant de chercher ;
  - le compte démo reçoit 403 (F-DEM-3, T-09).
- **Produit Open Food Facts valide (T-08) :**
  - un code numérique et un nom non vide ;
  - entre 0 et 900 kcal et entre 0 et 100 g de protéines pour 100 g ;
  - sinon le produit est écarté ;
  - le nom est `product_name_fr`, à défaut `product_name` ; la marque est la première de `brands`.
- **Entrée (C6) :**
  - avec un aliment : une quantité en grammes de 1 à 5 000 ; `kcal = kcal/100 g × quantité / 100` et `protéines = protéines/100 g × quantité / 100`, arrondis à 0,1 et **figés** ;
  - ajout rapide : un libellé de 1 à 80 caractères, de 0 à 5 000 kcal et de 0 à 500 g de protéines ;
  - chaque entrée garde son libellé, ce qui permet de supprimer un aliment perso sans toucher l'historique (le lien passe à `null`) ;
  - changer la quantité recalcule les valeurs en proportion des valeurs figées, sans relire l'aliment.
- **Repas (C7) :** `breakfast`, `lunch`, `dinner` et `snack`, affichés « Petit-déjeuner », « Déjeuner », « Dîner » et « Collation ».
- **Objectifs (C8, §6.7) :**
  - des kcal de 500 à 10 000 et des protéines de 0 à 500 g, avec une date d'effet ;
  - une nouvelle saisie à la même date remplace la précédente ;
  - l'objectif en vigueur un jour donné est le dernier dont la date d'effet est antérieure ou égale à ce jour.
- **Aliment perso :** un nom de 1 à 80 caractères, 0 à 900 kcal et 0 à 100 g de protéines pour 100 g, une décimale au plus.
- **ODbL (NF-10) :** la mention « Données Open Food Facts, licence ODbL » figure sous les résultats de recherche et dans « Plus ».
- **Journaux (T-11) :** aucun aliment, aucune quantité et aucune requête de recherche dans les logs.
- **Couleur :** la progression vers un objectif est en bleu (`action`). Un dépassement n'est jamais en orange, qui reste réservé aux régressions de performance.

## Choix faits par Claude (délégation du propriétaire)

1. **D24, cinquième onglet « Alimentation »** (Accueil, Séance, Alimentation, Exercices, Plus). On note ses repas tous les soirs, donc ils doivent être à un geste. « Objectifs » et « Mes aliments » sont dans « Plus ».
2. **D25, ajout d'une entrée :**
   - le bouton « Ajouter » de chaque repas ouvre `/alimentation/ajouter?date&meal` ;
   - la page montre la recherche, avec les aliments récents quand le champ est vide (F-ALI-6) ;
   - elle mène aussi à « Ajout rapide » et à « Nouvel aliment perso ».
3. **D26, duplication (F-ALI-7) :** un formulaire « Copier depuis » dans le journal. Il prend une date (la veille par défaut) et, au choix, toute la journée ou un seul repas. Les entrées copiées vont dans les mêmes repas.
4. **Interrupteur de test :** la variable `OPEN_FOOD_FACTS=off` coupe l'appel externe, pour des e2e sans réseau et déterministes. Elle est documentée dans `.env.example`.
5. **Libellé obligatoire sur chaque entrée :** c'est le nom de l'aliment au moment de l'ajout. Il simplifie la contrainte du modèle (« label exigé pour l'ajout rapide ») sans la contredire.

## Review Focus

1. **Open Food Facts lent, en erreur ou qui renvoie des données hostiles :**
   - au-delà de 3 s ou en cas d'erreur, seuls les résultats locaux reviennent, avec l'avertissement ;
   - un produit à 2 000 kcal pour 100 g, sans nom ou sans protéines est écarté. Le nom s'affiche échappé.
   - Tests : tâches 1 et 2.
2. **Le même produit vu deux fois :** une seule ligne `food` par code Open Food Facts, et pas de doublon dans les résultats (un aliment récent n'apparaît pas aussi dans les résultats Open Food Facts). Test : tâche 2.
3. **Isolation :**
   - les aliments perso, les entrées et les objectifs d'un autre utilisateur ne sont ni lus, ni modifiés, ni utilisables dans une entrée (404) ;
   - le compte démo reçoit 403 sur la recherche et sur chaque écriture.
   - Tests : tâches 2 et 3.
4. **Quantité modifiée et aliment perso supprimé ou corrigé :** les entrées passées gardent leurs valeurs figées et leur libellé. Changer 150 g en 300 g double les calories. Test : tâche 3.
5. **Copie d'une journée vers un jour qui a déjà des entrées :** elles s'ajoutent sans rien remplacer. Copier un jour vide ne fait rien et le dit. Tests : tâches 3 et 4.

---

### Tâche 1 : `core` — repas, schémas, calculs, produits Open Food Facts

**Files :** `packages/core/src/nutrition/meals.ts`, `nutrition/nutrients.ts`, `nutrition/off.ts`, `schemas/food.ts` (chacun avec son test), `index.ts`.

**Interfaces — Produces :**
- `MEALS` et le type `Meal` ; `mealLabel(m)`.
- Schémas :
  - `foodInputSchema` : `{ name, kcalPer100g, proteinPer100g }` ;
  - `foodEntryInputSchema` : union de `{ eatenOn, meal, foodId, quantityG }` et de `{ eatenOn, meal, label, kcal, proteinG }` ;
  - `foodEntryPatchSchema` : `{ meal?, quantityG?, label?, kcal?, proteinG? }`, avec au moins un champ ;
  - `copyEntriesSchema` : `{ fromDate, toDate, meal? }`, avec `fromDate` différent de `toDate` ;
  - `nutritionTargetInputSchema` : `{ validFrom, kcal, proteinG }`.
- Types :
  - `Food` : `{ id, name, brand, kcalPer100g, proteinPer100g, source: "custom" | "off" }` ;
  - `FoodResult` : `Food & { recent: boolean }` ;
  - `FoodEntry` : `{ id, eatenOn, meal, foodId, label, quantityG, kcal, proteinG }` ;
  - `NutritionTarget` : `{ validFrom, kcal, proteinG }` ;
  - `DayJournal` : `{ date, entries, totals: { kcal, proteinG }, target: NutritionTarget | null }` ;
  - `FoodSearchResponse` : `{ results: FoodResult[]; offUnavailable: boolean }`.
- Fonctions :
  - `entryNutrients(food, quantityG)` → `{ kcal, proteinG }`, arrondis à 0,1 ;
  - `scaleEntry(entry, quantityG)` → les mêmes valeurs à la nouvelle quantité, en proportion ;
  - `dayTotals(entries)` ;
  - `targetOn(targets, date)` ;
  - `parseOffHit(hit: unknown)` → `{ offCode, name, brand, kcalPer100g, proteinPer100g } | null` ;
  - `orderSearchResults(custom, recent, off)` → `FoodResult[]`, dans cet ordre et sans doublon d'identifiant.

- [ ] Tests :
  - 150 g de skyr à 62 kcal et 11 g de protéines → 93 kcal et 16,5 g ;
  - `scaleEntry` de 150 à 300 g double les valeurs ;
  - `targetOn` :
    - deux objectifs (1er octobre et 15 octobre) : le 14, l'objectif du 1er ; le 15, le nouvel objectif ;
    - avant le 1er : `null` ;
  - `parseOffHit` :
    - un produit valide est lu (avec le nom français, puis le nom de repli) ;
    - un produit à 2 000 kcal, sans protéines, sans nom ou au code non numérique → `null` ;
  - `foodEntryInputSchema` refuse 0 g et 5 001 g, et refuse un ajout rapide sans libellé ;
  - `copyEntriesSchema` refuse `fromDate === toDate` ;
  - `orderSearchResults` met perso, puis récents, puis Open Food Facts, sans doublon.
- [ ] RED, implémenter, GREEN, puis commit `feat(core): add nutrition schemas, nutrient calculations and Open Food Facts parsing`.

### Tâche 2 : base, aliments et recherche

**Files :**
- `apps/web/src/db/schema/nutrition.ts`, migration `drizzle/0004_nutrition.sql` ;
- `server/off-client.ts` ;
- `server/services/foods.ts`, `server/routes/foods.ts` ;
- `app/api/v1/foods/route.ts`, `foods/[id]/route.ts`, `foods/search/route.ts`, `foods/recent/route.ts` ;
- test `tests/integration/foods-api.test.ts`.

**Interfaces — Produces :**
- **Tables :**
  - `food` :
    - `id uuid`, `owner_id text null` (cascade), `source text` (check `off` ou `custom`), `off_code text null` ;
    - `name text`, `brand text null`, `kcal_per_100g numeric(5,1)`, `protein_per_100g numeric(4,1)`, `fetched_at timestamptz null`, `created_at` ;
    - index unique partiel sur `off_code` quand `source = 'off'` ;
    - `check` sur les bornes, et sur `source = 'custom'` ⇔ `owner_id` non nul ;
  - `food_entry` :
    - `id`, `user_id` (cascade), `eaten_on date`, `meal text` (check) ;
    - `food_id uuid null` (on delete set null), `label text`, `quantity_g numeric(5,1) null` (check > 0) ;
    - `kcal numeric(6,1)`, `protein_g numeric(5,1)`, `created_at` ;
    - index `(user_id, eaten_on)` ;
  - `nutrition_target` : `id`, `user_id`, `valid_from date`, `kcal int`, `protein_g int`, avec l'unicité `(user_id, valid_from)`.
- `searchOpenFoodFacts(q, signal): Promise<unknown[]>`. Il renvoie `[]` si `OPEN_FOOD_FACTS=off`.
- `makeFoodSearchRoutes(deps, off = searchOpenFoodFacts)` : `GET /api/v1/foods/search?q` → `FoodSearchResponse`. La limite de 6 appels externes par minute est tenue en mémoire, par utilisateur, et elle est remise à zéro pour les tests.
- `GET /api/v1/foods/recent` : les 20 derniers aliments utilisés, du plus récent au plus ancien.
- `POST /api/v1/foods` (201), `PATCH` et `DELETE /api/v1/foods/{id}` : aliments perso du propriétaire seulement, 404 sinon. Le `DELETE` répond 204, et les entrées gardent libellé et valeurs.

- [ ] Tests (avec un faux client Open Food Facts) :
  - l'ordre perso, récents, Open Food Facts ;
  - aucun appel externe à partir de 10 résultats locaux ;
  - les produits Open Food Facts sont mis en cache : un code déjà présent n'est pas dupliqué, et un deuxième appel trouve le produit en local ;
  - délai dépassé ou erreur → résultats locaux et `offUnavailable: true` ;
  - au-delà de 6 appels par minute → plus d'appel externe ;
  - `q` d'un seul caractère → 400 ; compte démo → 403 ;
  - un aliment perso d'un autre utilisateur → 404 en `PATCH` et en `DELETE`, et il n'apparaît jamais dans la recherche ;
  - `GET /foods/recent` est trié du plus récent au plus ancien.
- [ ] RED, implémenter, `db:generate` (migration renommée `0004_nutrition`, ajouts seulement), GREEN, puis commit `feat(api): add foods, Open Food Facts search and custom foods`.

### Tâche 3 : journal, copie et objectifs

**Files :** `server/services/food-entries.ts`, `server/services/nutrition-targets.ts`, routes et `app/api/v1/food-entries/…` et `nutrition-targets/…`, test `tests/integration/food-entries-api.test.ts`.

**Interfaces — Produces :**
- `GET /api/v1/food-entries?date` → `DayJournal`. Les entrées sont triées par repas puis par `created_at`, et l'objectif est celui en vigueur ce jour-là (`targetOn`).
- `POST /api/v1/food-entries` (201) :
  - avec un aliment : un aliment perso de l'utilisateur ou un produit Open Food Facts en cache, 404 sinon ; les valeurs sont figées par `entryNutrients` ;
  - ajout rapide : les valeurs telles quelles.
- `PATCH /api/v1/food-entries/{id}` :
  - une quantité ne s'applique qu'à une entrée avec quantité, et recalcule les valeurs par `scaleEntry` ;
  - un libellé, des kcal ou des protéines ne s'appliquent qu'à un ajout rapide ;
  - sinon 400 ;
  - `DELETE` répond 204.
- `POST /api/v1/food-entries/copy` → 201 avec `{ created: number }`.
- `GET /api/v1/nutrition-targets` : les objectifs, du plus récent au plus ancien.
- `POST /api/v1/nutrition-targets` : remplace l'objectif s'il en existe un à la même date, et répond 200.

- [ ] Tests :
  - l'entrée de 150 g de skyr est figée ; puis l'aliment perso est corrigé et supprimé, et l'entrée garde 93 kcal et son libellé ;
  - un `PATCH` de 150 à 300 g donne 186 kcal ;
  - un `PATCH` de kcal sur une entrée avec aliment → 400 ;
  - les totaux et l'objectif en vigueur du jour ;
  - copier un repas, puis une journée entière, vers un jour qui a déjà des entrées : tout s'ajoute ; copier un jour vide → `created: 0` ;
  - objectif posé deux fois à la même date : une seule ligne ;
  - accès croisé : entrées, aliments et objectifs d'un autre utilisateur → 404, ou liste vide ;
  - compte démo : 403 sur toutes les écritures.
- [ ] RED, implémenter, GREEN, puis commit `feat(api): add food journal, copy and nutrition targets`.

### Tâche 4 : journal du jour et navigation

**Files :**
- `src/components/nav-items.ts` (cinquième onglet) ;
- `app/(app)/alimentation/page.tsx`, `journal-screen.tsx`, `copy-form.tsx` ;
- `src/lib/nutrition-queries.ts` ;
- `src/lib/format.ts` : `formatKcal` (« 1 850 kcal ») et `formatGrams` (« 16,5 g ») ;
- test `tests/integration/journal-screen.test.tsx`.

**Contenu de l'écran :**
- Le titre est la date du jour, avec les boutons « Jour précédent » et « Jour suivant » de 44 px. Il n'y a pas de jour suivant après aujourd'hui.
- **Bloc « Objectifs du jour » :**
  - deux barres, kcal et protéines, avec « 1 450 / 2 400 kcal » et « 98 / 150 g » ;
  - les barres sont en `action` sur `rule-soft`, et une barre pleine reste bleue ;
  - sans objectif : « Pas d'objectif pour ce jour. » et un lien « Définir mes objectifs ».
- **Une section par repas**, avec :
  - le titre et le total du repas ;
  - la liste des entrées (libellé, quantité et valeurs) ;
  - le bouton « Ajouter » ;
  - pour chaque entrée, un bouton « Modifier » qui ouvre en place la quantité (ou le libellé, les kcal et les protéines d'un ajout rapide), et un bouton « Supprimer ».
- **Formulaire « Copier depuis » :** une date (la veille par défaut), « Toute la journée » ou un seul repas, et le bouton « Copier ». Les messages : « 3 entrées copiées. » et « Rien à copier ce jour-là. ».
- **Fraîcheur :** après chaque écriture, les requêtes `["journal"]` et `["foods-recent"]` sont invalidées.

- [ ] Test de composant :
  - totaux et objectifs affichés, puis l'état sans objectif ;
  - une entrée par repas ;
  - modifier la quantité envoie un `PATCH` ;
  - supprimer envoie un `DELETE` ;
  - la copie d'un jour vide affiche « Rien à copier ce jour-là. ».
- [ ] RED, implémenter, GREEN, puis commit `feat(web): add daily food journal with targets and copy`.

### Tâche 5 : ajouter une entrée, aliments perso, objectifs

**Files :**
- `app/(app)/alimentation/ajouter/page.tsx`, `add-entry.tsx` (recherche, récents, quantité, ajout rapide) ;
- `app/(app)/aliments/page.tsx`, `custom-foods.tsx` (liste, création, modification et suppression) ;
- `app/(app)/objectifs/page.tsx`, `targets-screen.tsx` ;
- `plus/page.tsx` (liens et mention ODbL) ;
- test `tests/integration/add-entry.test.tsx`.

**Contenu :**
- **Recherche :**
  - le champ « Rechercher un aliment » attend 400 ms après la frappe et 2 caractères au moins ;
  - champ vide : la liste « Récents » ;
  - les résultats montrent le nom, la marque, et les kcal et protéines pour 100 g ; la mention « Perso » ou « Récent » au besoin ;
  - l'avertissement « Open Food Facts ne répond pas : seuls tes aliments sont affichés. » au besoin ;
  - sous la liste, la mention ODbL.
- **Choix d'un aliment :**
  - un champ « Quantité (g) », 100 par défaut, avec l'aperçu « 93 kcal · 16,5 g de protéines » ;
  - le bouton « Ajouter au petit-déjeuner » ramène au journal du jour.
- **Ajout rapide :** les champs « Libellé », « Calories (kcal) » et « Protéines (g) ».
- **Nouvel aliment perso :** le nom, et les kcal et protéines pour 100 g. Une fois créé, l'aliment est choisi tout de suite.
- **Mes aliments** (lien dans « Plus ») : la liste des aliments perso, un formulaire pour les modifier, et leur suppression, qui laisse les entrées passées intactes.
- **Objectifs** (lien dans « Plus ») :
  - un formulaire avec la date d'effet (aujourd'hui par défaut), les kcal et les protéines ;
  - l'historique, du plus récent au plus ancien, avec « En vigueur » sur l'objectif actuel.

- [ ] Test de composant :
  - recherche temporisée : un seul appel après la frappe, et aucun sous 2 caractères ;
  - la liste des récents quand le champ est vide ;
  - choisir un aliment et saisir 150 g : aperçu « 93 kcal · 16,5 g de protéines », et le `POST` envoie `foodId` et `quantityG` ;
  - ajout rapide sans libellé : un message, et rien n'est envoyé ;
  - l'avertissement quand `offUnavailable` est vrai.
- [ ] RED, implémenter, GREEN, puis commit `feat(web): add food search, quick add, custom foods and targets`.

### Tâche 6 : e2e, documentation, revue et mise en production

**Files :**
- `e2e/alimentation.spec.ts`, `playwright.config.ts` (`OPEN_FOOD_FACTS=off`), `.env.example` ;
- les docs : architecture §5, §7 et §8, decisions D24 à D26, SPEC, GLOSSARY, DESIGN.md, design.json, CLAUDE.md ;
- ce plan.

- [ ] e2e :
  - poser un objectif ;
  - créer un aliment perso depuis la page d'ajout, l'ajouter à 150 g, voir les totaux et la barre ;
  - faire un ajout rapide ;
  - modifier puis supprimer une entrée ;
  - copier la veille ;
  - axe sans violation sur `/alimentation`, `/alimentation/ajouter`, `/objectifs` et `/aliments`, sans défilement horizontal à 375 px.
- [ ] Lint, types, tests et e2e verts.
- [ ] Revue de toute la branche, corrections, PR, CI verte, fusion, puis contrôles en production :
  - migration `0004` appliquée ;
  - routes à 401 sans session ;
  - une vraie recherche Open Food Facts fonctionne une fois connecté. Ce contrôle est laissé au propriétaire, faute de session automatisable en production.

## Critère de fin

Sur l'iPhone, le propriétaire note ses trois repas du soir en moins de 3 minutes, entre la recherche, les récents, l'ajout rapide et la copie de la veille. Il voit ses totaux face à ses objectifs.

Hors périmètre : le statut « jour engagé » (§6.7) et le croisement avec la performance, qui relèvent du Lot 5.
