# Lot 5 : tableau de bord et croisement — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Statut : terminé** (PR #9). Rédaction et exécution déléguées par le propriétaire le 01/11/2026 (« Go je te laisse t'en charger »), mêmes étapes que les lots 3 et 4.

**Goal :** l'accueil devient le tableau de bord de la semaine (séances, tendance du poids, jours engagés, exercices par tendance, prochaines suggestions). Une vue Croisement compare la progression du max estimé après des fenêtres alimentaires engagées et non engagées. La fiche exercice superpose l'alimentation à la courbe, et une régression renvoie au poids et à l'alimentation des jours concernés.

**Architecture :**
- Toutes les règles vivent dans `packages/core`, en fonctions pures testées :
  - jour engagé (§6.7) ;
  - fenêtre alimentaire, progressions et croisement (§6.8) ;
  - variation du poids moyen ;
  - phrase du croisement.
- Trois routes de lecture :
  - `GET /api/v1/nutrition/days?from&to` : totaux, objectif et statut de chaque jour ;
  - `GET /api/v1/stats/crossing` : croisement, tous exercices et par exercice ;
  - `GET /api/v1/stats/next` : suggestions des exercices de la dernière séance.
- Aucune table, aucune migration. Le reste se compose côté client avec les requêtes existantes (séances, pesées, tendances) et les fonctions de `core`.

**Tech Stack :** inchangée, Recharts 3.10.1 pour la superposition. Aucune dépendance.

**Spec :**
- [SPEC.md](../SPEC.md) F-TDB-1 à F-TDB-5 ;
- [architecture.md](../architecture.md) §6.7, §6.8 ;
- [GLOSSARY.md](../GLOSSARY.md) : jour renseigné, jour engagé, fenêtre alimentaire, croisement ;
- D20 : le lien de la règle 2 pointe désormais vers le poids et l'alimentation.

## Global Constraints

- Toutes celles des lots précédents. Le compte démo lit tout (ces routes sont des `GET`).
- **Jour engagé (§6.7)**, avec l'objectif en vigueur (`targetOn`) :
  - non renseigné : aucune entrée ;
  - non évalué : des entrées, aucun objectif ;
  - engagé : protéines ≥ 90 % de l'objectif **et** calories entre 90 % et 110 % ;
  - non engagé : les autres jours renseignés ;
  - bornes incluses : 90 % et 110 % sont engagés.
- **Fenêtre (§6.8)** :
  - pour une séance du jour J, les jours J-3, J-2 et J-1 ;
  - classée si au moins 2 de ses jours sont engagés ou non engagés ;
  - engagée si au moins 2/3 des jours classés sont engagés : 2 sur 2, 2 sur 3 et 3 sur 3, mais pas 1 sur 2 ni 1 sur 3 ;
  - une fenêtre non classée est exclue.
- **Progression** :
  - `(max(S) − max(P)) / max(P)`, où P est la séance précédente du même exercice qui a un max estimé ;
  - paire exclue si plus de 21 jours séparent P et S, ou si l'une n'a pas de max (poids du corps sans pesée).
- **Croisement** :
  - chaque groupe (engagé, non engagé) donne la moyenne des progressions, le nombre de progressions et le nombre de séances distinctes (`workoutId`) ;
  - tous exercices, et par exercice actif ;
  - **seuil** : sous 5 séances distinctes dans l'un des deux groupes, l'API ne renvoie **aucune moyenne** (`null`), seulement les comptes et les séances manquantes de chaque groupe.
- **Phrases** (§6.8), toujours descriptives :
  - « Après 3 jours bien suivis, ton max estimé a progressé en moyenne de +1,8 % (12 séances), contre −0,4 % sinon (7 séances). » ;
  - sous le seuil : « Pas encore assez de données : il manque 2 séances après des jours bien suivis et 5 après les autres. » (une partie seulement si un seul groupe manque) ;
  - jamais de lien de cause.
  - Le pourcentage est arrondi à 0,1, avec un signe toujours écrit (+, − ou 0,0 %).
- **Tendance du poids** :
  - moyenne glissante du jour contre celle d'il y a 7 jours (§6.6) ;
  - affichée seulement si les deux existent ;
  - « −0,4 kg en 7 jours », ou « stable sur 7 jours » sous 0,1 kg d'écart.
- **Semaine** : du lundi au dimanche de la semaine en cours, à Paris (`startOfWeek`).
- **Orange** : seulement pour une régression (exercice en régression, signal F-TDB-5). Les jours non engagés restent à l'encre douce, sans couleur de jugement.

## Review Focus

1. **Jour avec des entrées mais sans objectif** : « non évalué ». Il ne compte ni comme engagé ni comme non engagé, et une fenêtre qui n'a qu'un jour classé est exclue. Tests : tâche 1.
2. **Paire à 22 jours, ou séance au poids du corps sans pesée** : aucune progression. Une séance sans max n'interrompt pas la chaîne : P est la précédente qui a un max. Tests : tâche 2.
3. **Sous le seuil** : aucun chiffre de comparaison ne sort de l'API, ni n'apparaît à l'écran (pas de pourcentage dans le DOM). Tests : tâches 2, 3 et 5.
4. **Deux séances le même jour** : elles partagent la fenêtre. Le nombre de séances distinctes compte deux séances, et une séance qui contient trois exercices compte une seule fois. Tests : tâche 2.
5. **Objectif modifié en cours de semaine** : chaque jour est évalué avec l'objectif en vigueur ce jour-là. Test : tâche 1.

---

### Tâche 1 : `core` — jour engagé et fenêtre alimentaire

**Files :** nouveau `packages/core/src/nutrition/engagement.ts` (+ test), `index.ts`.

**Interfaces — Produces :**
- `type DayStatus = "unrecorded" | "unrated" | "engaged" | "notEngaged"`.
- `dayStatus(day: { kcal: number; proteinG: number; entryCount: number }, target: { kcal: number; proteinG: number } | null): DayStatus`.
- `type WindowStatus = "engaged" | "notEngaged"`.
- `windowStatus(statuses: DayStatus[]): WindowStatus | null`.
- `windowDays(sessionDate: string): string[]` : J-3, J-2, J-1.
- `dayStatusLabel(status): string` : « Non renseigné », « Non évalué », « Engagé », « Non engagé ».

**Tests :**
- 0 entrée donne `unrecorded`, même avec un objectif ;
- des entrées sans objectif donnent `unrated` ;
- objectif 2400 kcal / 150 g :
  - 2160 kcal et 135 g sont engagés (bornes) ;
  - 2640 kcal est engagé ;
  - 2641 kcal n'est pas engagé ;
  - 134,9 g n'est pas engagé ;
- fenêtres :
  - `[engaged, engaged, unrecorded]` est engagée ;
  - `[engaged, notEngaged, notEngaged]` n'est pas engagée ;
  - `[engaged, notEngaged, unrated]` (1 sur 2) n'est pas engagée ;
  - `[engaged, unrated, unrecorded]` donne `null` ;
- `windowDays("2026-11-02")` donne `["2026-10-30", "2026-10-31", "2026-11-01"]`.

- [ ] RED, implémentation, `pnpm --filter @maroutine/core test` vert, commit `feat(core): jour engagé et fenêtre alimentaire`.

### Tâche 2 : `core` — progressions, croisement, phrases, poids

**Files :** nouveau `packages/core/src/training/crossing.ts` (+ test) ; `training/weight.ts` (+ test) ; `schemas/stats.ts` ; `index.ts`.

**Interfaces — Produces :**
- `type Progression = { exerciseId: string; workoutId: string; performedOn: string; change: number }`.
- `progressions(exerciseId: string, stats: SessionStats[]): Progression[]`.
- `type CrossingGroup = { mean: number | null; progressions: number; sessions: number; missing: number }`.
- `type Crossing = { enough: boolean; engaged: CrossingGroup; notEngaged: CrossingGroup }`.
- `crossing(list: Progression[], windowOf: (date: string) => WindowStatus | null): Crossing` : `mean` à `null` dans les deux groupes quand `enough` est faux.
- `crossingText(c: Crossing): string`.
- `formatChange(change: number): string` : `0.0183` donne « +1,8 % » ; `-0.004` donne « −0,4 % ».
- `weightChange(weighIns: BodyWeight[], today: string, days = 7): number | null`.
- `weightChangeText(change: number): string`.
- Types de réponse dans `schemas/stats.ts` :
  - `CrossingResponse = { all: Crossing; byExercise: { exerciseId: string; name: string; crossing: Crossing }[] }` ;
  - `NutritionDay = { date; kcal; proteinG; entryCount; target: { kcal; proteinG } | null; status: DayStatus }` ;
  - `NextSuggestions = { workoutId: string | null; performedOn: string | null; items: { exerciseId; name; equipment; suggestion: Suggestion; text: string }[] }`.

**Tests :**
- progressions :
  - 100 puis 102 donne `0.02` ;
  - une séance sans max entre les deux ne coupe pas la paire ;
  - 22 jours d'écart excluent la paire, 21 la gardent ;
  - la première séance n'a pas de progression ;
- croisement :
  - 5 séances distinctes dans chaque groupe donnent `enough` et les moyennes ;
  - 4 séances dans un groupe donnent `mean: null` partout et `missing: 1` ;
  - deux exercices de la même séance comptent 2 progressions et 1 séance ;
  - une fenêtre `null` est exclue ;
- phrases :
  - la phrase complète de §6.8 avec les chiffres ;
  - sous le seuil, les deux formes (deux groupes manquants, un seul) ;
- poids :
  - `weightChange` donne `null` sans moyenne à J ou à J-7 ;
  - −0,4 donne « −0,4 kg en 7 jours » ;
  - 0,05 donne « stable sur 7 jours ».

- [ ] RED, implémentation, vert, commit `feat(core): progressions, croisement et tendance du poids`.

### Tâche 3 : API — jours alimentaires, croisement, prochaines suggestions

**Files :**
- `apps/web/src/server/services/nutrition-days.ts` ;
- `server/services/stats.ts` : `crossingStats`, `nextSuggestions` ;
- routes `server/routes/nutrition-days.ts` et `server/routes/stats.ts` ;
- `app/api/v1/nutrition/days/route.ts`, `app/api/v1/stats/crossing/route.ts`, `app/api/v1/stats/next/route.ts` ;
- tests `nutrition-days-api` et `stats-api`.

**Interfaces :**
- `nutritionDays(db, userId, from, to): NutritionDay[]` :
  - un élément par jour de `from` à `to`, jours vides compris ;
  - totaux par `sum` SQL groupés par `eaten_on`, arrondis à 0,1 par `dayTotals` ;
  - statut par `dayStatus` et `targetOn` ;
  - `from` et `to` obligatoires, 400 jours au plus, sinon 400.
- `crossingStats(db, userId): CrossingResponse` :
  - histoires de tous les exercices, `statsOf`, puis `progressions` ;
  - statut des jours de toute la période couverte ;
  - `windowOf` par `windowDays` et `windowStatus` ;
  - `byExercise` pour les exercices actifs, triés par nom.
- `nextSuggestions(db, userId): NextSuggestions` :
  - la dernière séance, puis `suggestNext` sur tout l'historique de chacun de ses exercices non archivés, dans l'ordre de la séance ;
  - sans aucune séance, `items: []`.

**Tests :**
- jours :
  - 3 jours, dont un vide, donnent 3 éléments avec leurs statuts ;
  - l'objectif changé au 2e jour est appliqué jour par jour ;
  - isolation (T-01) ;
  - `to` avant `from` renvoie 400 ;
- croisement :
  - un jeu de 10 séances avec entrées et objectif donne les bonnes moyennes et les bons comptes ;
  - sous le seuil, aucune clé `mean` non nulle dans la réponse ;
  - isolation ;
- prochaines suggestions :
  - l'ordre de la dernière séance ;
  - un exercice archivé est omis ;
  - sans séance, une liste vide ;
- le compte démo lit ces trois routes (200).

- [ ] RED, implémentation, vert, commit `feat(web): routes jours alimentaires, croisement et prochaines suggestions`.

### Tâche 4 : accueil — tableau de bord de la semaine (F-TDB-1)

**Files :**
- `app/(app)/home-screen.tsx` ;
- `home-weight.tsx` (ligne de tendance) ;
- nouveaux `home-nutrition.tsx`, `home-trends.tsx`, `home-next.tsx` ;
- `lib/stats-queries.ts` : `nutritionDaysQuery`, `crossingQuery`, `nextQuery`, `invalidateStats` étendu ;
- `lib/nutrition-queries.ts` : `invalidateJournal` invalide aussi `nutrition-days` et `crossing` ;
- tests `home-dashboard`.

**Ordre de l'accueil :**
1. calendrier d'activité ;
2. Poids, plus la tendance (« −0,4 kg en 7 jours ») ;
3. Cette semaine :
   - les séances ;
   - « Alimentation : 3 jours engagés sur 5 renseignés », avec 7 pastilles L à D (engagé en `action`, non engagé en `rule`, non évalué et non renseigné vides, chacune nommée) et un lien vers Repas ;
4. Exercices :
   - trois groupes « En progression », « En stagnation », « En régression » (orange), avec les noms vers la fiche ;
   - les inactifs et ceux sans assez de données ne sont pas listés ;
5. Prochaine séance : la suggestion de chaque exercice de la dernière séance ;
6. lien « Croisement ».

Chaque bloc a son propre chargement et sa propre erreur : un bloc en échec n'empêche pas les autres.

**Tests :**
- la phrase des jours engagés et les 7 pastilles nommées (« lundi 26 octobre : engagé ») ;
- les groupes de tendance, la régression en orange avec un lien vers la fiche ;
- la ligne de tendance du poids, absente sans moyenne ;
- les suggestions dans l'ordre ;
- la page reste lisible si `/stats/next` échoue ;
- e2e : la boucle axe passe sur l'accueil.

- [ ] RED, implémentation, vert, commit `feat(web): tableau de bord de la semaine sur l'accueil`.

### Tâche 5 : écran Croisement (F-TDB-3, F-TDB-4)

**Files :**
- `app/(app)/croisement/page.tsx` et `croisement/crossing-screen.tsx` ;
- `components/nav-items.ts` : « Plus » couvre `/croisement` ;
- `plus/page.tsx` : lien « Croisement » ;
- tests `crossing-screen`, e2e `croisement.spec.ts` et la boucle axe.

**Interfaces :**
- en tête, la phrase « Tous exercices » ;
- au-dessus du seuil, deux cartes « Après 3 jours bien suivis » et « Sinon », chacune avec sa moyenne, ses progressions et ses séances ;
- puis la liste par exercice, avec la phrase et les comptes de chacun ;
- une mention : « Une comparaison de moyennes, pas une explication : le sommeil, la fatigue ou le programme comptent aussi. » ;
- en bas, comment c'est calculé, en deux phrases : fenêtre de 3 jours, jour engagé.

**Tests :**
- au-dessus du seuil, la phrase et les comptes ;
- sous le seuil, « Pas encore assez de données » et aucun « % » dans la page ;
- par exercice ;
- « Plus » est actif sur `/croisement` ;
- e2e : la page s'ouvre depuis « Plus », sous le seuil sur la base e2e, et passe axe.

- [ ] RED, implémentation, vert, commit `feat(web): écran Croisement`.

### Tâche 6 : fiche exercice — alimentation superposée et signal de régression (F-TDB-2, F-TDB-5)

**Files :**
- `exercices/[id]/progress-chart.tsx` : barres alimentaires sur un axe caché ;
- `exercices/[id]/exercise-stats.tsx` : choix « Superposer » et encart de régression ;
- nouveau `exercices/[id]/regression-context.tsx` ;
- tests `exercise-stats` et `regression-context`.

**Interfaces :**
- **Choix « Superposer » :** « Rien », « Calories », « Protéines », en boutons `aria-pressed`. Les barres sont les totaux quotidiens de la période (`nutritionDaysQuery`) en `ink-soft` à 25 %, derrière la courbe, sur leur propre échelle. Le résumé textuel ajoute la moyenne quotidienne de la période (« 2 310 kcal par jour en moyenne sur 18 jours renseignés »).
- **Encart « Autour de la baisse » (F-TDB-5)**, quand la tendance est `regressing` :
  - pour la dernière séance qui a un max, les 3 jours de sa fenêtre : date, kcal et protéines face à l'objectif, statut nommé, et un lien vers `/alimentation?date=…` ;
  - la moyenne du poids ce jour-là et sa variation sur 7 jours, avec un lien vers `/poids` ;
  - un fond `regression-wash` ;
  - **D20 :** dans « Prochaine séance », le lien de la règle 2 devient « Voir le poids et l'alimentation » et vise cet encart (id par `useId`).

**Tests :**
- le choix « Protéines » demande `nutrition/days` sur la période et affiche la moyenne dans le résumé ;
- pas de requête alimentaire tant que « Rien » est choisi ;
- l'encart apparaît seulement en régression, avec les 3 jours, les statuts nommés et les liens ;
- le lien de la règle 2 vise l'encart.

- [ ] RED, implémentation, vert, commit `feat(web): alimentation sur la fiche exercice et signal de régression`.

### Tâche 7 : documentation et clôture

- `docs/decisions-ouvertes.md` : D32 (ordre de l'accueil et blocs), D33 (choix de superposition), D34 (encart de régression et D20 accompli), D35 (phrases sous le seuil) ;
- `docs/SPEC.md` : table API ;
- `docs/architecture.md` : écrans, §5 si besoin ;
- `docs/GLOSSARY.md` : « jour bien suivi » est la formule des phrases, pour un jour engagé ;
- `apps/web/DESIGN.md`, `CLAUDE.md`, ce plan.

Lint, types, tests et e2e verts, revue finale par un sous-agent opus, PR `lot-5`, CI, fusion, vérification en production.
