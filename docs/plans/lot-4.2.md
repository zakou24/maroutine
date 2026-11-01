# Lot 4.2 : calendrier d'activité en couleurs — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Statut : validé** le 01/11/2026 (« garde comme ça et essaye d'écrire le chiffre du jour aussi dans la case »), après le choix de la maquette E, « par muscle », sur le [canevas des propositions](https://claude.ai/artifact/DN9FLZisbCk76V7A8uLszd).

**Goal :** les petits carrés du calendrier d'activité de l'accueil montrent, par leur couleur, les muscles travaillés chaque jour, et portent le chiffre du jour.

**Architecture :**
- La règle « muscles d'une séance » vit dans `packages/core` :
  - ce sont les muscles choisis ;
  - à défaut, les groupes de ses exercices.
- Le résumé des séances (`GET /workouts`) applique cette règle ; le détail (`GET /workouts/{id}`) garde les muscles choisis, que l'éditeur affiche.
- Les couleurs sont des jetons CSS. Le dessin d'un carré (une couleur, une diagonale ou des bandes) est une fonction de `apps/web`.

**Tech Stack :** inchangée, sans nouvelle dépendance.

**Spec :** [D28](../decisions-ouvertes.md), qui reportait l'affichage des muscles dans le calendrier ; décision du propriétaire du 01/11/2026 : une couleur par muscle, sur l'accueil seulement, chiffre du jour dans la case. L'écran Calendrier ne change pas.

## Global Constraints

- **Couleurs**, toutes à 4,5:1 au moins avec un chiffre blanc. Jamais d'orange (réservé aux régressions, D13) :

  | Groupe | Couleur | Jeton |
  |---|---|---|
  | Pectoraux | `#1f5fa8` | `--muscle-chest` |
  | Dos | `#0b6e63` | `--muscle-back` |
  | Épaules | `#2a78b5` | `--muscle-shoulders` |
  | Biceps | `#6d45bd` | `--muscle-biceps` |
  | Triceps | `#b0367f` | `--muscle-triceps` |
  | Jambes | `#2f7a2b` | `--muscle-legs` |
  | Abdominaux | `#5b6878` | `--muscle-abs` |

- **Carré d'un jour de séance** :
  - les muscles de toutes les séances du jour, sans doublon, dans l'ordre des groupes ;
  - 1 muscle : une couleur ;
  - 2 muscles : coupé en diagonale ;
  - 3 ou plus : en bandes verticales.
- **Séance sans aucun muscle** (exercices « Non classés ») : carré `rule` (`#d9e0e8`) avec le chiffre à l'encre, et « Sans muscle » dans la légende si un tel jour est affiché.
- **Chiffre du jour** dans chaque carré passé ou présent : blanc et gras sur un jour de séance, encre douce sur un jour sans séance. Les jours futurs restent vides.
- **Lecteur d'écran** : le nom d'un jour de séance est « 28 octobre, 2 séances, Pectoraux, Triceps ». Le chiffre visible est caché aux lecteurs d'écran, et le nom passe par un texte `sr-only`, comme dans l'écran Calendrier (label-content-name-mismatch le 1er du mois).
- **Légende** sous la grille : les groupes présents sur les 3 mois, dans l'ordre des groupes.
- **Détail du jour** (accueil seulement) : chaque séance montre ses muscles en pastilles colorées, avec leur nom.

## Review Focus

1. **Séance d'avant le Lot 4.1** (aucun muscle choisi, exercices classés par la migration) : son carré prend la couleur de ses exercices. Test : tâche 1.
2. **Deux séances le même jour** (Jambes, puis Pectoraux et Triceps) : un carré en bandes des trois muscles, et le compte « 2 séances ». Test : tâche 2.
3. **Le 1er du mois** : axe ne signale pas d'écart entre le nom et le texte visible. Test : e2e axe sur l'accueil.
4. **Jour sélectionné et aujourd'hui** : le contour reste visible sur toutes les couleurs. Test : tâche 2.

---

### Tâche 1 : `core` et API — muscles d'une séance dans le résumé

**Files :** `packages/core/src/training/catalog.ts` (+ test), `index.ts` ; `apps/web/src/server/services/workouts.ts` ; test `workouts-api`.

**Interfaces — Produces :**
- `sessionMuscleGroups(chosen: readonly MuscleGroup[], exerciseGroups: readonly (MuscleGroup | null)[]): MuscleGroup[]`.
- `listWorkouts` joint `exercise` et renvoie `muscleGroups = sessionMuscleGroups(choisis, groupes des exercices)`.

**Tests :**
- `sessionMuscleGroups(["abs"], ["legs"])` donne `["abs"]` ;
- `sessionMuscleGroups([], ["triceps", null, "chest", "triceps"])` donne `["chest", "triceps"]` ;
- `sessionMuscleGroups([], [null])` donne `[]` ;
- API :
  - une séance sans muscles choisis, avec un exercice `legs`, a `["legs"]` dans le résumé et `[]` dans le détail ;
  - les comptes d'exercices et de séries ne changent pas.

- [ ] RED, implémentation, vert, commit `feat: muscles d'une séance déduits de ses exercices dans le résumé`.

### Tâche 2 : accueil — carrés colorés, chiffre du jour, légende, détail

**Files :** `apps/web/src/app/globals.css` (jetons), nouveau `src/lib/muscle-colors.ts` (+ test), `src/app/(app)/activity-calendar.tsx`, `src/app/(app)/calendrier/calendar-view.tsx` (`WorkoutLink` : `showMuscles`) ; tests `activity-calendar`, `muscle-colors`.

**Interfaces :**
- `MUSCLE_COLOR: Record<MuscleGroup, string>` (les `var(--muscle-…)`) ;
- `squareBackground(groups: readonly MuscleGroup[]): string` ;
- `WorkoutLink` prend `showMuscles?: boolean`, `false` par défaut.

**Tests :**
- `squareBackground` : 1 couleur, une diagonale à 135°, des bandes à 90° pour 3 ;
- le calendrier d'activité :
  - affiche le chiffre de chaque jour passé ;
  - nomme un jour « 28 octobre, 2 séances, Jambes, Pectoraux, Triceps » ;
  - n'a pas de bouton pour un jour sans séance ;
  - affiche la légende des groupes présents ;
  - montre les muscles du jour choisi en pastilles ;
  - marque d'un contour le jour choisi et aujourd'hui ;
- e2e : la boucle axe passe sur l'accueil.

- [ ] RED, implémentation, vert, commit `feat(web): calendrier d'activité coloré par muscle`.

### Tâche 3 : documentation et clôture

`docs/decisions-ouvertes.md` (D31), `apps/web/DESIGN.md` (jetons `muscle-*`, calendrier d'activité), `docs/architecture.md` (écran Accueil), `CLAUDE.md`, ce plan. Lint, types, tests, e2e, revue finale, PR, CI, fusion, vérification en production.
