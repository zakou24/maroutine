# Lot 1.1 : retours du propriétaire — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Statut : terminé** (PR #3).

**Goal :** appliquer les premiers retours du propriétaire après la mise en production du Lot 1 :
- échauffement et cardio notés une fois par séance ;
- catalogue d'exercices à cocher ;
- calendrier d'activité façon GitHub sur l'accueil ;
- « Saisie » renommée en « Séance » ;
- libellés clarifiés.

**Architecture :** inchangée. Le catalogue et les nouvelles règles de validation vivent dans `packages/core`. Deux colonnes s'ajoutent à `workout` (migration `0002`). Une route `POST /api/v1/exercises/batch` crée plusieurs exercices en une transaction.

**Tech Stack :** celle du Lot 1, sans nouvelle dépendance.

**Spec :** [SPEC.md](../SPEC.md) F-SEA-1, F-SEA-2, F-TDB ; [decisions-ouvertes.md](../decisions-ouvertes.md) C4, à mettre à jour. Décisions du propriétaire du 31/10/2026 :
- échauffement oui / non pour la séance ;
- cardio par choix rapides 10 / 15 / 20 min ou « Autre » ;
- catalogue d'exercices dans Exercices et dans la séance ;
- calendrier d'activité sur les 3 derniers mois.

## Global Constraints

- Toutes celles du [Lot 1](lot-1.md#global-constraints).
- **Échauffement** (remplace C4) : une case « Échauffement fait » par séance, décochée par défaut. Il n'y a plus de case par série : toutes les séries saisies comptent dans les stats.
- **Ancienne colonne `workout_set.is_warmup`** : elle reste en base pour les séries déjà saisies, qui restent exclues des stats. L'interface ne la propose plus, et le préremplissage ignore ces séries.
- **Cardio** : facultatif, une durée entière de 1 à 180 min. Choix rapides 10, 15 et 20 min, plus « Autre » qui ouvre un champ minutes. Pas de type de cardio.
- **Catalogue** :
  - 40 exercices courants, en français, rangés par groupe musculaire (Pectoraux, Dos, Épaules, Jambes, Bras, Abdominaux) ;
  - chaque entrée porte son matériel ;
  - un exercice du catalogue devient un exercice ordinaire de l'utilisateur à l'ajout, puis se règle, s'archive et se renomme normalement ;
  - un nom déjà présent, sans tenir compte de la casse, n'est pas recréé.
- **Calendrier d'activité** :
  - les 13 dernières semaines (environ 3 mois) jusqu'à aujourd'hui, une colonne par semaine du lundi au dimanche, sur iPhone comme sur ordinateur ;
  - teinte par jour : aucune séance en `rule-soft`, 1 séance en `action`, 2 et plus en `action-strong` ;
  - jamais d'orange, de jaune ni de vert.
- Vocabulaire : « Séance » remplace « Saisie » partout dans l'interface. La route `/saisie` est gardée, car elle est invisible dans la PWA.

## Review Focus

1. **Séance saisie avant ce lot**, avec des séries marquées échauffement, puis ouverte en modification : les séries d'échauffement ne doivent ni disparaître ni devenir des séries de travail sans que le propriétaire le voie. Tests : tâches 2 et 3.
2. **Cardio « Autre »** avec « 0 », « 12,5 » ou vide : refusé avec un message clair, et rien n'est envoyé. Test : tâche 3.
3. **Catalogue coché deux fois**, ou exercice du catalogue déjà créé à la main (« squat » contre « Squat ») : aucun doublon, ni erreur 409 bloquante. Tests : tâches 2 et 4.
4. **Calendrier d'activité un lundi, ou le 1er du mois** : la dernière colonne contient bien aujourd'hui, et les jours futurs de la semaine restent vides, sans case cliquable. Test : tâche 5.
5. **Lecteur d'écran sur le calendrier d'activité** : un résumé textuel est lu (« 12 séances sur les 3 derniers mois »), et chaque jour de séance est un bouton nommé. Test : tâche 5.

---

### Tâche 1 : `core` — catalogue, séance et préremplissage

**Files :** `packages/core/src/training/catalog.ts` (+ test), `schemas/workout.ts` (+ test), `index.ts`.

**Interfaces — Produces :**
- `EXERCISE_CATALOG: readonly { name: string; equipment: Equipment; group: MuscleGroup }[]`, avec 40 entrées aux noms uniques.
- `MUSCLE_GROUPS` et `muscleGroupLabel(g)`.
- `workoutInputSchema` ajoute :
  - `warmupDone: boolean`, `false` par défaut ;
  - `cardioMinutes: int 1..180 | null`, absent ou `null` par défaut.
- `Workout` et `WorkoutSummary` ajoutent `warmupDone` et `cardioMinutes`.
- `setInputSchema.isWarmup` reste facultatif (défaut `false`), pour les séances existantes.

- [ ] Tests :
  - noms du catalogue uniques sans tenir compte de la casse, et chaque groupe non vide ;
  - `cardioMinutes` : 0, 181 et 12,5 refusés ; 15 et `null` acceptés ;
  - `warmupDone` à `false` par défaut.
- [ ] RED, implémenter, GREEN, puis commit `feat(core): add exercise catalog, session warm-up and cardio`.

### Tâche 2 : base et API

**Files :** `src/db/schema/training.ts`, migration `drizzle/0002_session_extras.sql`, `services/workouts.ts`, `services/exercises.ts`, `routes/exercises.ts`, `app/api/v1/exercises/batch/route.ts`, tests d'API.

**Interfaces — Produces :**
- Colonnes de `workout` :
  - `warmup_done boolean not null default false` ;
  - `cardio_minutes integer null`, avec `check` entre 1 et 180.
- `POST /api/v1/exercises/batch` :
  - corps : `{ exercises: ExerciseInput[] }`, de 1 à 50 entrées ;
  - réponse 200 : `{ created: Exercise[]; existing: Exercise[] }`, sans 409 sur un nom déjà pris ;
  - une seule transaction.
- `lastSets` ignore les séries `is_warmup`.
- `listWorkouts` renvoie `warmupDone` et `cardioMinutes`.

- [ ] Tests :
  - une séance avec échauffement et 15 min de cardio se relit à l'identique ;
  - le lot crée les nouveaux exercices et renvoie l'existant pour « squat » face à « Squat » ;
  - isolation : le lot d'un utilisateur ne voit pas les exercices d'un autre ;
  - `last-sets` saute les séries d'échauffement d'une ancienne séance ;
  - une ancienne séance avec des échauffements se relit avec `isWarmup: true`.
- [ ] Générer la migration et relire le SQL : uniquement des ajouts (T-12). RED, GREEN, puis commit `feat(api): store session warm-up and cardio, add exercises batch`.

### Tâche 3 : écran Séance

**Files :** `seances/workout-editor.tsx`, `workout-draft.ts`, `exercise-picker.tsx`, `components/nav-items.ts`, `saisie/page.tsx`, tests et e2e.

**Changements :**
- **Onglet** : « Séance », icône inchangée.
- **Titre** : « Séance du soir » en création, « Séance du 30 oct. » en modification.
- **Grille des séries** : la colonne « Échauf. » disparaît. En modification, une ancienne série d'échauffement garde la mention « échauffement » sur sa ligne, et peut se supprimer.
- **Bloc en bas de séance**, avant la note :
  - interrupteur « Échauffement fait » ;
  - interrupteur « Cardio », qui révèle les boutons 10 min, 15 min, 20 min et Autre (un champ minutes, `inputmode="numeric"`) ;
  - message d'erreur : « Durée de cardio entre 1 et 180 minutes. »
- **Brouillon** : `WorkoutDraft` ajoute `warmupDone: boolean` et `cardio: string | null`. `parseStoredDraft` accepte un ancien brouillon sans ces champs.
- **Choix d'exercice** :
  - un champ « Rechercher » ;
  - la section « Tes exercices » ;
  - la section « Catalogue », qui liste les exercices du catalogue pas encore créés, par groupe ;
  - choisir une entrée du catalogue la crée (POST), puis l'ajoute à la séance.

- [ ] Tests (brouillon et éditeur) :
  - échauffement et cardio 15 min sont envoyés dans le corps ;
  - « Autre » avec « 0 » ou « 12,5 » affiche le message et n'appelle pas l'API ;
  - un ancien brouillon sans `warmupDone` est restauré ;
  - choisir « Squat » dans le catalogue crée l'exercice puis l'ajoute ;
  - la recherche filtre les deux sections.
- [ ] e2e `saisie.spec.ts`, mis à jour : séance avec cardio 15 min, puis relecture.
- [ ] Commit `feat(web): session warm-up, cardio and exercise catalog in the session screen`.

### Tâche 4 : écran Exercices

**Files :** `exercices/page.tsx`, `exercices/catalogue/page.tsx` + `catalog-picker.tsx`, `exercise-form.tsx`, `exercices/[id]/exercise-detail.tsx`, tests et e2e.

**Changements :**
- **Bouton « Depuis le catalogue »** à côté de « Nouvel exercice ». Il ouvre une liste à cocher par groupe musculaire, où les exercices déjà créés sont cochés et grisés, et un bouton fixe « Ajouter (n) » qui appelle le lot.
- **Formulaire de création** : sans « Pas d'augmentation » (valeur par défaut selon le matériel).
- **Fiche de l'exercice** : le champ reste dans les réglages, avec l'aide « De combien monter la charge quand tu progresses. Sert aux suggestions de charge. »

- [ ] Tests :
  - la sélection de 3 exercices envoie un seul lot avec leur matériel ;
  - un exercice déjà créé apparaît coché et grisé.
- [ ] e2e : ajouter 3 exercices depuis le catalogue, puis les retrouver dans la liste.
- [ ] Commit `feat(web): add exercises from a catalog`.

### Tâche 5 : accueil — calendrier d'activité

**Files :** `packages/core/src/dates/calendar.ts` (`activityWeeks`), `app/(app)/activity-calendar.tsx`, `week-summary.tsx`, tests et e2e.

**Interfaces — Produces :**
- `activityWeeks(today: string, weeks: number): string[][]` : `weeks` colonnes de 7 jours, du lundi au dimanche, la dernière contenant `today`.
- `ActivityCalendar({ today })` :
  - lit `GET /api/v1/workouts` sur la période ;
  - affiche les initiales des mois au-dessus des colonnes et L, M, V à gauche, comme la capture `docs/capture/1.png`, aux couleurs de la direction A ;
  - les cases sont carrées, de 18 à 22 px selon la largeur, avec 4 px d'écart ;
  - une case de séance est un bouton (« 28 octobre, 1 séance ») qui affiche dessous les séances du jour, avec lien ;
  - jours futurs vides et non cliquables ;
  - légende « Aucune · 1 séance · 2 et plus » ;
  - résumé lu par les lecteurs d'écran : « 12 séances sur les 3 derniers mois ».

**Accueil**, de haut en bas :
1. le calendrier d'activité ;
2. la liste « Cette semaine », où « 2 séries » devient « 2 séries de travail » et où « · cardio 15 min » s'ajoute si besoin ;
3. le bouton « Séance du soir ».

Le poids viendra sous le calendrier au Lot 3.

- [ ] Tests :
  - `activityWeeks("2026-11-02", 13)` : 13 colonnes, la dernière commence le 2 novembre ;
  - `activityWeeks` un dimanche ;
  - le calendrier marque 1 séance et 2 séances avec deux teintes ;
  - un jour futur n'est pas un bouton ;
  - le résumé textuel est présent.
- [ ] e2e : une séance du jour apparaît dans le calendrier d'activité. Test axe de l'accueil, sans défilement horizontal sur iPhone.
- [ ] Commit `feat(web): add activity calendar to the home screen`.

### Tâche 6 : documentation, revue et mise en production

- `decisions-ouvertes.md` :
  - D14 : échauffement par séance, remplace C4 ;
  - D15 : cardio ;
  - D16 : catalogue ;
  - D17 : calendrier d'activité 3 mois.
- `SPEC.md` : F-SEA-2, F-STA-1, F-TDB.
- `GLOSSARY.md` : « Échauffement », « Cardio ».
- `apps/web/DESIGN.md` : composant calendrier d'activité.
- Revue de code de la branche par un relecteur neuf, PR `lot-1.1`, CI verte, fusion, vérification de la migration `0002` en production.
- Commit `docs: record owner feedback decisions`.
