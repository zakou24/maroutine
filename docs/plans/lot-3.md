# Lot 3 : poids de corps — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Statut : terminé** (PR #5). Le propriétaire a délégué la rédaction et l'exécution de ce plan le 01/11/2026 (« je te laisse en charge du plan du lot 3… met en prod »).

**Goal :** noter une pesée par jour et suivre son poids : sa courbe, sa moyenne glissante sur 7 jours, son couloir de tendance. Les pesées complètent aussi les exercices au poids du corps, qui gagnent leur max estimé (C5).

**Architecture :**
- Une table `body_weight` (clé `user_id` + `measured_on`) et la migration `0003`, qui ne fait qu'ajouter.
- La moyenne glissante (§6.6) et le couloir du poids sont des fonctions pures de `packages/core`.
- Trois routes REST, `GET /body-weights`, `PUT` et `DELETE /body-weights/{date}`, comme prévu par la spec.
- Les services de stats du Lot 2 reçoivent enfin les vraies pesées au lieu d'une liste vide.

**Tech Stack :** celle du Lot 2, sans nouvelle dépendance.

**Spec :** [SPEC.md](../SPEC.md) F-POI-1, F-POI-2, API « Pesées » ; [architecture.md](../architecture.md) §6.1 (charge effective), §6.6, §7 (`BODY_WEIGHT`), §8 (écran Poids) ; [decisions-ouvertes.md](../decisions-ouvertes.md) C5, C13, D6, D13, D17 ; [threat-model.md](../threat-model.md) T-01 (pesées) et T-11.

## Global Constraints

- Toutes celles du [Lot 2](lot-2.md#global-constraints).
- **Pesée :**
  - en kg, avec une décimale au plus, entre 20 et 300 kg ;
  - une seule par jour : une nouvelle saisie le même jour remplace la précédente (F-POI-1) ;
  - la date est une date calendaire (C13) ; une date future est refusée (400).
- **Moyenne glissante (§6.6) :**
  - pour chaque jour J, la moyenne des pesées de J-6 à J, s'il y en a au moins 3 ;
  - sinon, pas de valeur ce jour-là, et la courbe s'interrompt.
- **Couloir du poids (D22, sur le modèle de D18) :** chaque jour qui a une moyenne glissante a aussi un couloir, qui va de la plus petite à la plus grande pesée de J-6 à J.
- **Poids du corps (C5) :** la charge effective est la dernière pesée de J-14 à J, plus le lest. Les stats, la tendance et la suggestion utilisent désormais les pesées.
- **Journaux (T-11) :** aucune valeur de pesée dans les logs.
- **Écrans :**
  - l'accueil montre le bloc Poids sous le calendrier d'activité (D17), avec une saisie rapide de la pesée du jour ;
  - l'écran `/poids` (lien depuis l'accueil et depuis « Plus ») montre la courbe, une saisie à n'importe quelle date passée, et la liste des pesées.
- **Vocabulaire :** « pesée », « moyenne glissante », jamais « mesure » ni « poids » seul pour une pesée.

## Choix faits par Claude (délégation du propriétaire)

1. **D22, couloir du poids :** le min et le max des pesées des 7 derniers jours, ce qui reprend la logique du couloir du max estimé (D18).
2. **D23, emplacement de la saisie :**
   - un champ « Pesée du jour » sur l'accueil, sous le calendrier, à l'emplacement que D17 lui réservait ;
   - l'écran Poids pour les autres dates, la courbe et la liste ;
   - pas de nouvel onglet : la barre en garde quatre.
3. **Bornes :** 20 à 300 kg et pas de date future. Les bornes évitent une faute de frappe (« 784 ») ; la date future serait une erreur de saisie.
4. **`GET /body-weights` sans `from`** renvoie tout l'historique, pour la période « Tout » de la courbe. L'écart entre `from` et `to` n'est pas limité : une pesée par jour pèse peu.
5. **Suppression :** un bouton par pesée dans la liste, sans dialogue de confirmation, puisqu'il suffit de la ressaisir.

## Review Focus

1. **Moyenne glissante avec des trous :** 2 pesées seulement dans la fenêtre donnent `null`. Les jours sans pesée mais avec 3 pesées dans la fenêtre ont une valeur. Tests : tâche 1.
2. **Saisie « 78,4 », « 78.45 », « 7840 » ou une date future :** la première est acceptée et la virgule est comprise ; les autres sont refusées avec un message clair, côté client comme côté serveur. Tests : tâches 1, 2 et 4.
3. **Même jour saisi deux fois :** une seule ligne en base, avec la dernière valeur. Après une suppression, l'accueil et l'écran Poids se mettent à jour sans recharger la page. Tests : tâches 2 et 4.
4. **Exercice au poids du corps :**
   - avec une pesée à J-14, il a un max estimé ;
   - à J-15, il n'en a pas ;
   - la fiche affiche alors la courbe au lieu de la phrase d'attente.
   - Tests : tâches 2 et 4.
5. **Isolation :** les pesées d'un autre utilisateur ne sont jamais lues ni effacées. Le compte démo ne peut ni saisir ni supprimer (403). Test : tâche 2.

---

### Tâche 1 : `core` — pesée, moyenne glissante, couloir

**Files :** `packages/core/src/schemas/body-weight.ts` (+ test), `training/weight.ts` (+ test), `index.ts`.

**Interfaces — Produces :**
- `weighInInputSchema = z.object({ weightKg })`, avec un nombre entre 20 et 300 et au plus une décimale.
- `isTenthKg(n: number): boolean`
- `BodyWeight = { date: string; weightKg: number }`. Pour les stats, le serveur la convertit en `WeighIn` (`{ date, kg }`, Lot 2).
- `WeightPoint = { date: string; weightKg: number | null; average: number | null; low: number | null; high: number | null }`
- `weightSeries(weighIns: BodyWeight[], from: string, to: string): WeightPoint[]` : un point par jour de `from` à `to`. La fenêtre de J-6 à J peut lire des pesées antérieures à `from`.
- `formatWeight(n: number): string` : « 78,4 » (une décimale).

- [ ] Tests :
  - `isTenthKg` : 78,4 vrai et 78,45 faux ;
  - schéma : 19,9 et 300,1 refusés ;
  - fenêtre de 7 jours :
    - 3 pesées les jours J-6, J-3 et J donnent leur moyenne, avec un couloir du min au max ;
    - une pesée à J-7 ne compte pas ;
    - 2 pesées donnent `null` ;
  - un jour sans pesée a `weightKg: null`, mais une moyenne si la fenêtre compte 3 pesées ;
  - les pesées antérieures à `from` alimentent les premiers jours.
- [ ] RED, implémenter, GREEN, puis commit `feat(core): add weigh-in schema, moving average and weight corridor`.

### Tâche 2 : base, API et stats au poids du corps

**Files :**
- `apps/web/src/db/schema/body-weight.ts` (exporté par le schéma), migration `drizzle/0003_body_weight.sql` ;
- `server/services/body-weights.ts`, `server/routes/body-weights.ts`, `app/api/v1/body-weights/route.ts`, `app/api/v1/body-weights/[date]/route.ts` ;
- `server/services/stats.ts` ;
- tests `tests/integration/body-weights-api.test.ts` et `stats-api.test.ts`.

**Interfaces — Produces :**
- Table `body_weight` :
  - `user_id text` (cascade), `measured_on date`, `weight_kg numeric(4,1)` ;
  - clé primaire `(user_id, measured_on)` ;
  - `check` de 20 à 300.
- `GET /api/v1/body-weights?from&to` : deux dates facultatives (sans `from`, tout l'historique), triées par date, renvoie `BodyWeight[]`.
- `PUT /api/v1/body-weights/{date}` avec `{ weightKg }` : insère ou remplace et renvoie 200 avec la `BodyWeight`. Une date future (Paris) ou invalide renvoie 400.
- `DELETE /api/v1/body-weights/{date}` : 204, même si la pesée n'existe pas (idempotent).
- Stats : `exerciseStats`, `exerciseSuggestion` et `exerciseTrends` chargent les pesées de l'utilisateur, une seule requête et seulement s'il y a un exercice au poids du corps, puis les passent à `sessionStats`.

- [ ] Tests :
  - PUT deux fois le même jour : une ligne, la dernière valeur ;
  - `78.45`, `19`, une date du lendemain et `2026-02-30` sont refusés en 400 ;
  - GET filtré par `from` et `to`, puis sans bornes ;
  - DELETE puis GET vide ; DELETE d'une date absente donne 204 ;
  - un autre utilisateur ne voit ni n'efface la pesée ;
  - le compte démo reçoit 403 en PUT et en DELETE et 200 en GET ; sans session, 401 ;
  - stats d'un exercice au poids du corps :
    - avec une pesée à J-14 de 80 kg et une série de 10 × 5, `latest.estimatedMax` vaut 90 × (1 + 5/30) ;
    - avec une pesée à J-15, il vaut `null`.
- [ ] RED, implémenter, appliquer `pnpm db:generate` et vérifier la migration (ajouts seulement), GREEN, puis commit `feat(api): add body weights and use them for bodyweight exercises`.

### Tâche 3 : écran Poids

**Files :**
- `apps/web/src/app/(app)/poids/page.tsx`, `weight-screen.tsx`, `weight-chart.tsx`, `weight-form.tsx` ;
- `src/lib/body-weights-query.ts` ;
- `plus/page.tsx` (lien « Poids ») ;
- test de composant `tests/integration/weight-screen.test.tsx`.

**Contenu de l'écran :**
- Titre « Poids ».
- **Formulaire « Noter une pesée » :**
  - la date (aujourd'hui par défaut, sans date future) et le champ « Pesée (kg) » en clavier décimal ;
  - le bouton « Enregistrer » ;
  - si une pesée existe déjà à cette date, le champ est prérempli et le bouton dit « Remplacer » ;
  - message après l'enregistrement : « Pesée enregistrée. ».
- **Section « Courbe » :**
  - les quatre boutons de période du Lot 2 ;
  - la courbe Recharts : couloir en aire `corridor`, moyenne glissante en ligne `action` qui s'interrompt sans valeur, pesées en points ;
  - le résumé : « 12 pesées sur 3 mois. Moyenne sur 7 jours : 78,2 kg. », ou « … Pas encore de moyenne sur 7 jours (3 pesées en 7 jours). ».
- **Section « Pesées » :**
  - une liste, de la plus récente à la plus ancienne : la date, « 78,4 kg » et un bouton « Supprimer la pesée du 31 octobre » de 44 px ;
  - état vide : « Aucune pesée pour l'instant. ».
- **Fraîcheur :** après l'enregistrement ou la suppression, invalider `["body-weights"]` et les stats (`invalidateStats`).

- [ ] Test de composant :
  - liste et résumé ;
  - « 78,45 » → « La pesée prend une décimale au plus. » sans appel à l'API ;
  - une date déjà pesée préremplit le champ et le bouton devient « Remplacer » ;
  - la suppression appelle `DELETE`.
- [ ] RED, implémenter, GREEN, puis commit `feat(web): add body weight screen with moving-average chart`.

### Tâche 4 : bloc Poids de l'accueil et e2e

**Files :** `home-screen.tsx`, `home-weight.tsx`, e2e `poids.spec.ts`, `fiche.spec.ts` et `calendrier.spec.ts` (axe sur `/poids`).

**Contenu du bloc :**
- Il se place sous le calendrier d'activité et commence par le titre « Poids ».
- Quand des pesées existent, il affiche la dernière (« 78,4 kg, le 31 octobre ») et la moyenne sur 7 jours si elle existe.
- Un champ « Pesée du jour (kg) » enregistre en un geste. S'il y a déjà une pesée aujourd'hui, le champ est prérempli et le bouton dit « Remplacer ».
- Le lien « Voir la courbe » ouvre `/poids`.

- [ ] e2e :
  - pesée saisie sur l'accueil, retrouvée sur `/poids`, remplacée, puis supprimée ;
  - un exercice au poids du corps, avec une pesée à J-2, affiche « Dernier max estimé » sur sa fiche ;
  - axe sans violation sur `/poids` et `/`.
- [ ] RED, implémenter, GREEN, puis commit `feat(web): add weigh-in block to home screen`.

### Tâche 5 : documentation, revue et mise en production

**Files :**
- `docs/architecture.md` : §6.6 (couloir du poids), §8 (Accueil, Poids) ;
- `docs/decisions-ouvertes.md` : D22 et D23 ;
- `docs/SPEC.md` : routes des pesées, avec la précision sur `from` ;
- `docs/GLOSSARY.md` ;
- `apps/web/DESIGN.md` et `.impeccable/design.json` : courbe du poids et bloc Poids ;
- `CLAUDE.md` ;
- ce plan, passé en « terminé ».

- [ ] Lint, types, tests et e2e verts.
- [ ] Revue de toute la branche, corrections, PR `lot-3`, CI verte, fusion, puis contrôles en production :
  - santé ok et migration `0003` appliquée ;
  - les routes des pesées répondent 401 sans session.
- [ ] Commit `docs: document lot 3 body weight`.

## Critère de fin

Sur l'iPhone, le propriétaire note sa pesée du soir depuis l'accueil en un geste. Il voit sa courbe et sa moyenne glissante sur l'écran Poids. Ses tractions et ses dips ont un max estimé dès qu'une pesée date de moins de 14 jours.

Hors périmètre : la tendance du poids dans la semaine de l'accueil et le croisement avec l'alimentation (Lot 5).
