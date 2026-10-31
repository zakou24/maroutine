# Lot 2 : stats et suggestions — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Statut : terminé** (PR #4).

**Goal :** calculer pour chaque exercice le max estimé, la meilleure série, le volume, la tendance et la suggestion de la prochaine séance. Les afficher à trois endroits :
- sur une fiche exercice, avec la courbe du max estimé dans son couloir de tendance ;
- dans la liste des exercices ;
- à côté de chaque exercice pendant la séance.

**Architecture :**
- Toutes les règles de [architecture.md §6.1 à §6.5](../architecture.md#6-calculs-et-statistiques) sont des fonctions pures de `packages/core`, qui reçoivent l'historique d'un exercice et renvoient des valeurs.
- Le serveur lit l'historique (séances, séries), appelle `core` et renvoie le résultat. Aucun calcul n'a lieu en SQL ni dans un composant.
- Rien n'est stocké : les stats sont recalculées à chaque lecture, donc une séance modifiée ou supprimée est prise en compte tout de suite. Le lot n'a pas de migration.

**Tech Stack :** celle du Lot 1.1, plus **Recharts** (prévu par la spec, figé à ce lot par [ADR 0001](../adr/0001-stack-technique.md) : dernière 3.x publiée depuis plus de deux semaines, version exacte, aujourd'hui `3.10.1`).

**Spec :** [SPEC.md](../SPEC.md) F-STA-1 à F-STA-5, F-SEA-3 (suggestion affichée dans la séance) ; [architecture.md §6](../architecture.md#6-calculs-et-statistiques) et §8 (écrans Exercices et Fiche exercice) ; [ADR 0005](../adr/0005-max-estime-epley.md), [ADR 0006](../adr/0006-suggestions-par-regles.md) ; [decisions-ouvertes.md](../decisions-ouvertes.md) C5, C12, D13, D14.

## Global Constraints

- Toutes celles du [Lot 1.1](lot-1.1.md#global-constraints).
- **Série de travail :** série non marquée échauffement (les anciennes, avant D14) avec au moins 1 répétition. Elle seule entre dans les stats.
- **Max estimé (Epley) :**
  - `charge` si 1 répétition, sinon `charge × (1 + reps / 30)` ;
  - affiché avec une décimale (« 22,7 kg ») ;
  - marqué « approx. » quand il vient d'une série de plus de 12 répétitions.
- **Poids du corps :**
  - charge effective = dernière pesée de J-14 à J + lest ;
  - les pesées arrivent au Lot 3, donc `core` reçoit une liste de pesées et le serveur passe une liste vide à ce lot ;
  - d'ici là, ces exercices n'ont ni max estimé ni volume, et leur tendance est « Pas assez de données » ;
  - les règles 3 et 4 de la suggestion s'appliquent quand même sur le lest.
- **Tendance (§6.4) :**
  - les 6 dernières séances ayant un max estimé ;
  - moins de 6 : « Pas assez de données » ;
  - la plus récente de ces 6 date de plus de 30 jours : « Inactif » ;
  - Δ > +1 % : « En progression » ; Δ < −1 % : « En régression » ; sinon « En stagnation ».
- **Suggestion (§6.5) :**
  - les quatre règles, dans l'ordre, sur la dernière séance avant la date de la séance en cours (les séances du même jour ne comptent pas, comme pour le préremplissage) ;
  - la justification est toujours affichée en une phrase ;
  - aucune règle « première série » (C12).
- **Ordre chronologique :** `performed_on`, puis `created_at` pour plusieurs séances le même jour (F-SEA-6).
- **Couleur :**
  - l'orange (`regression*`) sert uniquement à la tendance « En régression » et à la suggestion de la règle 2 (max en baisse) ;
  - la courbe est en `action` et son couloir en `corridor` ;
  - jamais de vert ni de rouge.
- **Accessibilité :** chaque graphique est accompagné d'un résumé textuel lu par VoiceOver, et l'historique en liste donne les mêmes chiffres (NF-8).
- **Vocabulaire :** « max estimé » (jamais « 1RM »), « meilleure série », « volume », « séance ».

## Choix à valider avec ce plan

1. **Couloir de tendance**, la signature de la direction A (D13), qu'aucune formule ne définissait. Proposition : pour chaque séance, le couloir va du plus petit au plus grand max estimé des 3 dernières séances, celle-ci comprise. Il n'a aucune constante arbitraire et s'explique en une phrase. Il entre dans architecture.md §6.9.
2. **Règle 4 quand la première série est déjà en haut de la fourchette** (sans que toutes les séries y soient) : la cible reste le haut de la fourchette. La phrase devient « Tu as fait 25 × 10 : refais 25 × 10 sur toutes tes séries. » au lieu de « vise 25 × 10 ».
3. **Lien de la règle 2** (« … + lien vers la période ») : le poids et l'alimentation n'existent pas encore. Au Lot 2, il renvoie vers l'historique de la fiche exercice. Le Lot 5 (F-TDB-5) le fera pointer vers le poids et l'alimentation des jours concernés.
4. **Fiche exercice :**
   - elle montre les stats ;
   - les réglages actuels (nom, matériel, fourchette, pas, archivage) passent sur `/exercices/[id]/reglages`, ouverts par un lien « Réglages » ;
   - le volume par séance est une colonne de l'historique plutôt qu'un second graphique, par souci de sobriété.
5. **Nouvelle route `GET /api/v1/exercises/trends`** (tendance et dernier max de chaque exercice actif) pour la liste, en un seul appel au lieu d'un appel par exercice.

## Review Focus

1. **Anciennes séries d'échauffement et séries à 0 répétition :** elles sont exclues du max, du volume, de la meilleure série et des « séries retenues » de la règle 3. Tests : tâches 1 et 3.
2. **Exercice au poids du corps sans pesée :**
   - pas de max estimé ni de volume, et la meilleure série est celle au plus de répétitions ;
   - tendance « Pas assez de données » ;
   - la suggestion avance quand même sur le lest (« poids du corps × 9 ») ;
   - pas de courbe vide sur la fiche.
   - Tests : tâches 1, 3 et 5.
3. **Deux séances le même jour, ou séance modifiée puis rouverte :** l'ordre suit `created_at`. Après l'enregistrement d'une séance, la fiche, la liste et les suggestions ne montrent plus d'anciennes valeurs (invalidation des requêtes). Tests : tâches 4 et 6.
4. **Période « 1 mois » un 31 mars :** le début est le 28 (ou 29) février, et non un 3 mars par débordement. Test : tâche 1.
5. **Exercice d'un autre utilisateur, ou archivé :** `stats` et `suggestion` répondent 404 pour un autre utilisateur, et `trends` ne liste que les exercices actifs de la session. Un exercice archivé garde sa fiche. Test : tâche 4.

---

### Tâche 1 : `core` — séries de travail, max estimé, meilleure série, volume, périodes

**Files :** `packages/core/src/training/stats.ts` (+ test), `dates/calendar.ts` (+ test), `index.ts`.

**Interfaces — Produces :**
- `HistorySet = { weightKg: number; reps: number; isWarmup: boolean }`
- `ExerciseSession = { workoutId: string; performedOn: string; sets: HistorySet[] }`, dans l'ordre chronologique.
- `WeighIn = { date: string; kg: number }`
- `isWorkingSet(set: HistorySet): boolean`
- `estimatedMax(weightKg: number, reps: number): number`, en valeur brute (l'arrondi n'a lieu qu'à l'affichage).
- `bodyWeightOn(date: string, weighIns: WeighIn[]): number | null`, la dernière pesée de J-14 à J.
- `SessionStats = { workoutId; performedOn; estimatedMax: number | null; approximate: boolean; bestSet: { weightKg: number; reps: number } | null; volumeKg: number | null; workingSetCount: number }`
- `sessionStats(session: ExerciseSession, equipment: Equipment, weighIns: WeighIn[]): SessionStats`. La meilleure série est affichée telle que saisie (le lest pour le poids du corps).
- `Period = "1m" | "3m" | "1y" | "all"` et `periodStart(today: string, period: Period): string | null`.
- `addMonthsToDate(date: string, months: number): string`, qui ramène au dernier jour du mois quand le jour n'existe pas.

- [ ] Tests :
  - exemples du cadrage : 20 × 3 → 22,0 ; 20 × 4 → 22,67 ; 25 × 3 → 27,5 ; 1 répétition → la charge ;
  - meilleure série : à max égal, la plus grande charge l'emporte ;
  - approximatif : max tiré d'une série de 13 répétitions ;
  - séries d'échauffement et à 0 répétition ignorées ; une séance sans série de travail donne `estimatedMax: null`, `bestSet: null` et `workingSetCount: 0` ;
  - poids du corps :
    - pesée à J-14 prise, à J-15 ignorée, à J+1 ignorée ;
    - avec une pesée de 80 kg et un lest de 10 × 5, le max vaut 90 × (1 + 5/30) ;
    - sans pesée, max et volume sont `null`, et la meilleure série est celle au plus de répétitions ;
  - volume = Σ charge effective × répétitions ;
  - `periodStart("2027-03-31", "1m")` → `"2027-02-28"` ; `"all"` → `null` ; `"1y"` depuis le 29 février.
- [ ] RED, implémenter, GREEN, puis commit `feat(core): add estimated max, best set and volume`.

### Tâche 2 : `core` — tendance et couloir

**Files :** `packages/core/src/training/trend.ts` (+ test), `index.ts`.

**Interfaces — Consumes :** `SessionStats` (tâche 1). **Produces :**
- `Trend = "progressing" | "stalling" | "regressing" | "inactive" | "insufficient"`
- `exerciseTrend(stats: SessionStats[], today: string): Trend`
- `trendLabel(t: Trend): string` : « En progression », « En stagnation », « En régression », « Inactif », « Pas assez de données ».
- `CorridorPoint = { workoutId: string; performedOn: string; value: number; low: number; high: number }`
- `trendCorridor(stats: SessionStats[]): CorridorPoint[]`, construit sur les seules séances ayant un max estimé (choix 1).

- [ ] Tests :
  - 5 séances avec max (et 3 sans) → `insufficient` ;
  - 6 séances dont la dernière remonte à 31 jours → `inactive`, et à 30 jours → pas `inactive` ;
  - Δ = +1,01 % → `progressing` ; +1 % pile → `stalling` ; −1,01 % → `regressing` ;
  - seules les 6 dernières comptent (une 7ᵉ très ancienne ne change rien) ;
  - couloir : 1ʳᵉ séance `low = high = value` ; 4ᵉ séance = min et max des séances 2 à 4.
- [ ] RED, implémenter, GREEN, puis commit `feat(core): add exercise trend and trend corridor`.

### Tâche 3 : `core` — suggestion et sa phrase

**Files :** `packages/core/src/training/suggestion.ts` (+ test), `index.ts`.

**Interfaces — Consumes :** `ExerciseSession`, `SessionStats`, `isWorkingSet` (tâche 1). **Produces :**
- `Suggestion`, union discriminée par `rule` :
  - `{ rule: "first" }` ;
  - `{ rule: "declining"; weightKg; reps }` ;
  - `{ rule: "top-of-range"; weightKg; reps; done: { sets: number; reps: number; weightKg: number } }` ;
  - `{ rule: "add-rep"; weightKg; reps; done: { weightKg: number; reps: number } }`.
- `suggestNext(sessions: ExerciseSession[], stats: SessionStats[], exercise: Pick<Exercise, "equipment" | "repMin" | "repMax" | "incrementKg">): Suggestion`. S est la dernière séance ayant au moins une série de travail.
- `loadLabel(equipment: Equipment, weightKg: number): string` : « 25 kg », « poids du corps », « poids du corps + 5 kg ».
- `suggestionText(s: Suggestion, equipment: Equipment): string`, avec les phrases exactes de §6.5 :
  - « Première fois : choisis une charge confortable. »
  - « Ton max estimé baisse depuis 2 séances : garde la charge et regarde ta récupération et ton alimentation. »
  - « Tu as fait 3 × 10 à 22,5 kg, le haut de ta fourchette : passe à 25 kg. »
  - « Tu as fait 25 × 3 : vise 25 × 4. », ou la variante « refais » du choix 2.

- [ ] Tests (un par règle et par bord) :
  - aucune séance → `first` ;
  - maxima 30 > 29 > 28 sur les trois dernières séances avec max → `declining`, même charge et même nombre de répétitions que la première série retenue ; une baisse d'une seule séance n'y suffit pas ;
  - 3 séries à 22,5 kg et 10 répétitions (fourchette 6–10, pas 2,5) → `top-of-range` à 25 kg × 6, avec la phrase exacte ci-dessus ;
  - séries à la charge de référence seulement : 25 × 3 puis 20 × 12 → la série à 20 kg est ignorée, et la règle 4 donne 25 × 4 ;
  - règle 4 plafonnée : première série 25 × 10 (fourchette 6–10), deuxième 25 × 8 → 25 × 10, avec la phrase « refais » ;
  - poids du corps sans pesée : 3 × 12 au lest 0 (fourchette 8–12, pas 2,5) → `top-of-range` à « poids du corps + 2,5 kg » ; la règle 2 ne s'applique jamais sans max ;
  - séries d'échauffement et séries à 0 répétition hors des séries retenues.
- [ ] RED, implémenter, GREEN, puis commit `feat(core): add next-session suggestion rules`.

### Tâche 4 : API — stats, suggestion, tendances

**Files :** `apps/web/src/server/services/stats.ts` (+ test d'intégration), `server/routes/stats.ts`, `app/api/v1/exercises/[id]/stats/route.ts`, `app/api/v1/exercises/[id]/suggestion/route.ts`, `app/api/v1/exercises/trends/route.ts`.

**Interfaces — Consumes :** tâches 1 à 3, `getExercise` et `listExercises` (Lot 1). **Produces :**
- `exerciseHistory(db, userId, exerciseId, before?: string): Promise<ExerciseSession[]>` : une requête pour toutes les séries de l'exercice, triées par `performed_on`, `created_at`, puis position.
- `GET /api/v1/exercises/{id}/stats?period=1m|3m|1y|all` (`3m` par défaut, 400 pour une autre valeur) → `ExerciseStatsResponse` :
  - `trend: Trend` et `latest: SessionStats | null`, sur tout l'historique ;
  - `sessions: SessionStats[]` et `corridor: CorridorPoint[]` limités à la période. Le couloir est calculé sur tout l'historique, puis coupé, pour que son début ne parte pas de zéro.
- `GET /api/v1/exercises/{id}/suggestion?before=YYYY-MM-DD` → `{ suggestion: Suggestion; text: string }`.
- `GET /api/v1/exercises/trends` → `{ exerciseId: string; trend: Trend; latestMax: number | null; approximate: boolean }[]` pour les exercices actifs.
- `today` vient de `todayIn("Europe/Paris")` côté serveur, et les pesées passées à `core` sont `[]` jusqu'au Lot 3.
- Types de réponse exportés par `core` (`ExerciseStatsResponse`, `SuggestionResponse`, `ExerciseTrendSummary`).

- [ ] Tests d'intégration (PGlite) :
  - 6 séances progressives → `progressing`, `latest` juste, et `sessions` filtré par la période ;
  - deux séances le même jour : la plus récente en `created_at` est S pour la suggestion du lendemain ;
  - `before` exclut le jour même ;
  - accès croisé : `stats` et `suggestion` d'un exercice d'un autre utilisateur → 404 ; `trends` ne liste que les siens ; un identifiant invalide → 404 ;
  - sans session → 401 ; compte démo → 200 en lecture ;
  - `period=2w` → 400.
- [ ] RED, implémenter, GREEN, puis commit `feat(api): add exercise stats, suggestion and trends endpoints`.

### Tâche 5 : fiche exercice

**Files :**
- `apps/web/src/app/(app)/exercices/[id]/exercise-detail.tsx`, réécrite en fiche de stats ;
- `[id]/progress-chart.tsx` ;
- `[id]/reglages/page.tsx` et `exercise-settings.tsx`, qui reprennent le formulaire et l'archivage actuels ;
- `src/lib/format.ts` : `formatMax` (une décimale) et `formatVolume` (« 1 240 kg ») ;
- `package.json` (Recharts) ;
- e2e `exercices.spec.ts` et `fiche.spec.ts`.

**Interfaces — Consumes :** routes de la tâche 4, `trendLabel`, `loadLabel`, `suggestionText`.

**Contenu de la fiche, de haut en bas :**
- titre (nom de l'exercice) et lien « Réglages » de 44 px ;
- puce de tendance (orange seulement pour « En régression ») et « Dernier max estimé : 27,5 kg », suivi de « approx. » au besoin ;
- encart « Prochaine séance » : cible en gras (« 25 kg × 4 ») et la phrase. Il est sur voile de couloir, et sur voile de régression pour la règle 2, avec le lien « Voir l'historique » ;
- section « Max estimé » :
  - quatre boutons « 1 mois », « 3 mois », « 1 an », « Tout » (`aria-pressed`, 44 px) ;
  - courbe Recharts : points et ligne en `action`, couloir en aire `corridor`, axes en encre douce, chiffres tabulaires ;
  - résumé textuel sous la courbe : « 12 séances sur 3 mois, de 22,0 à 27,5 kg. » ;
- section « Historique » : une ligne par séance (date en lien vers la séance, meilleure série, max estimé, volume), de la plus récente à la plus ancienne ;
- état vide : « Pas encore de séance avec cet exercice. » ;
- poids du corps sans max : pas de courbe, mais la phrase « Le max estimé des exercices au poids du corps utilise ta pesée : il arrivera avec le suivi du poids. »

- [ ] e2e :
  - les tests existants de réglages et d'archivage passent par « Réglages » ;
  - nouvelle fiche avec 6 séances créées par l'API :
    - tendance, dernier max et phrase de suggestion visibles ;
    - « 1 mois » change le résumé ;
    - l'historique liste les séances ;
  - exercice au poids du corps : aucun graphique, phrase d'attente ;
  - axe sans violation, sur iPhone et ordinateur.
- [ ] RED, implémenter, GREEN, puis commit `feat(web): add exercise stats page with estimated-max chart`.

### Tâche 6 : liste des exercices et suggestion dans la séance

**Files :** `exercices/exercise-list.tsx`, `seances/workout-editor.tsx`, `seances/suggestion-note.tsx`, e2e `exercices.spec.ts` et `saisie.spec.ts`.

**Interfaces — Consumes :** `GET /exercises/trends`, `GET /exercises/{id}/suggestion?before=`.

**Contenu :**
- **Liste des exercices :** chaque ligne ajoute la tendance et le dernier max (« En progression · 27,5 kg »). « En régression » est en encre de régression. Si `trends` échoue, la liste reste affichée sans ces infos.
- **Séance :** sous la grille de chaque exercice, une note « Suggestion : 25 kg × 4 » suivie de la phrase. Le style suit celui de la fiche (voile de couloir, voile de régression pour la règle 2), et la règle 1 n'affiche que la phrase. La note est chargée par exercice, avec la date de la séance en `before`, donc elle apparaît aussi sur un brouillon restauré ou une séance rouverte.
- **Fraîcheur :** après l'enregistrement ou la suppression d'une séance, invalider `["exercise-stats"]`, `["exercise-trends"]` et `["suggestion"]`.

- [ ] e2e :
  - la liste montre la tendance d'un exercice qui a 6 séances ;
  - dans une séance du soir, ajouter un exercice déjà fait affiche « Suggestion : … » et la bonne phrase ;
  - après l'enregistrement d'une nouvelle séance, la fiche montre le nouveau dernier max sans recharger la page ;
  - axe.
- [ ] RED, implémenter, GREEN, puis commit `feat(web): show trends in exercise list and suggestions in session`.

### Tâche 7 : documentation et clôture

**Files :**
- `docs/architecture.md` : §6.9 Couloir de tendance et §8 (Fiche exercice, Réglages) ;
- `docs/SPEC.md` : tableau API avec `/exercises/trends` ;
- `docs/decisions-ouvertes.md` : choix 1 à 4, une fois validés ;
- `docs/adr/0001-stack-technique.md` : version de Recharts ;
- `docs/GLOSSARY.md` : Tendance, Couloir de tendance ;
- `apps/web/DESIGN.md` et `.impeccable/design.json` : courbe, couloir, puce de tendance, encart de suggestion, usage de l'orange ;
- `CLAUDE.md` : état et tableau des docs ;
- ce plan, passé en « terminé ».

- [ ] `pnpm lint && pnpm typecheck && pnpm test` et e2e verts, et couverture de `core` ≥ 90 % (NF-9).
- [ ] Revue de toute la branche, corrections, PR `lot-2` → `main`, CI verte, fusion, puis vérification en production : santé ok, et les nouvelles routes répondent 401 sans session.
- [ ] Commit `docs: document lot 2 stats and suggestions`.

## Critère de fin

Sur l'iPhone du propriétaire :
- la fiche d'un exercice déjà fait plusieurs fois montre la courbe du max estimé dans son couloir et une suggestion justifiée ;
- la liste des exercices montre leur tendance ;
- en ajoutant cet exercice à la séance du soir, la suggestion s'affiche sous les séries préremplies.

Hors périmètre de ce lot : les pesées (Lot 3) et l'accueil enrichi des tendances et suggestions (Lot 5, F-TDB-1).
