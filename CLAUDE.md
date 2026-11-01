# MaRoutine

Projet perso et portfolio (profil fullstack) : application web installable (PWA) de suivi de musculation. Le soir, on saisit séance, pesée et alimentation. L'app calcule la progression, suggère la prochaine charge et met les performances en regard de l'alimentation. Next.js full-stack TypeScript, Neon, Vercel, budget 0 €.

## État actuel

- **Lot 0 (socle) livré** (PR #1), en production sur https://maroutine-nu.vercel.app. Le propriétaire est créé et l'app est installée sur son iPhone.
- **Lot 1 (séances) livré** (PR #2) : exercices, saisie du soir préremplie, séances passées, calendrier, semaine. Reste la recette du propriétaire sur iPhone (critère de fin du [plan](docs/plans/lot-1.md)).
- **Lot 1.1 (retours du propriétaire)** : échauffement et cardio par séance, catalogue de 40 exercices, calendrier d'activité sur l'accueil, « Saisie » devenue « Séance ». Plan [docs/plans/lot-1.1.md](docs/plans/lot-1.1.md), décisions D14 à D17.
- **Lot 2 (stats et suggestions) livré** (PR #4) : max estimé, meilleure série, volume, tendance, suggestion justifiée ; fiche exercice avec la courbe du max estimé dans son couloir (Recharts), tendances dans la liste, suggestion dans la séance. Plan [docs/plans/lot-2.md](docs/plans/lot-2.md), décisions D18 à D21.
- **Lot 3 (poids) livré** (PR #5) : pesée du jour sur l'accueil, écran Poids (courbe, moyenne glissante sur 7 jours, couloir, liste), table `body_weight` (migration `0003`) ; les exercices au poids du corps ont leur max estimé grâce aux pesées. Plan [docs/plans/lot-3.md](docs/plans/lot-3.md), écrit et exécuté par délégation, décisions D22 et D23.
- **Lot 4 (alimentation) livré** (PR #6) : onglet Repas (journal du jour, totaux face aux objectifs, modification, suppression, copie), recherche Open Food Facts côté serveur avec cache, aliments perso, ajout rapide, objectifs datés ; tables `food`, `food_entry`, `nutrition_target` (migration `0004`). Plan [docs/plans/lot-4.md](docs/plans/lot-4.md), écrit et exécuté par délégation, décisions D24 à D26. Prochaine étape : plan du Lot 5 (tableau de bord et croisement).
- Direction visuelle **A — Courbes** (D13, [canevas](https://claude.ai/artifact/WStbXSegxDLEsFJhceFYXC)). `PRODUCT.md` (racine) est la fiche produit lue par la skill de design impeccable ; le système construit est décrit dans [apps/web/DESIGN.md](apps/web/DESIGN.md), et le contrat de direction des écrans de l'app dans `apps/web/.impeccable/surfaces/`. L'orange est réservé aux régressions.
- Machine de développement : Mac, 8 Go de RAM, pas de Docker ([ADR 0009](docs/adr/0009-base-de-donnees-dev-et-tests.md)). Le shell par défaut est en Node 23 : utiliser Node 24 (`~/.nvm/versions/node/v24.11.0/bin` en tête du PATH).
- Vercel : projet `maroutine` (racine `apps/web`, Node 24, fonctions à Paris `cdg1`), base Neon `maroutine-db` (offre gratuite, Francfort), réservée à la production. Les aperçus la partagent en lecture : ne jamais y saisir.
- Développement local et e2e : PGlite en fichier (`DATABASE_URL=pglite:./.data/dev`, [ADR 0010](docs/adr/0010-pglite-pour-le-developpement-et-les-e2e.md)). Les migrations de production s'appliquent au build de production.
- Déploiement automatique : chaque push sur `main` part en production, chaque autre branche donne un aperçu.

## Commandes

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test          # tout le monorepo (Vitest, PGlite)
pnpm --filter @maroutine/web test:e2e             # Playwright iPhone + ordinateur (build de prod, base PGlite e2e neuve, connexion unique)
pnpm --filter @maroutine/web dev                  # nécessite apps/web/.env.local (DATABASE_URL=pglite:./.data/dev)
pnpm --filter @maroutine/web db:generate          # migration Drizzle depuis le schéma
pnpm --filter @maroutine/web db:migrate           # applique sur DATABASE_URL_UNPOOLED, sinon DATABASE_URL (pglite: compris)
npx auth@1.7.14 generate --config src/server/auth.ts --output src/db/schema/auth.ts   # schéma Better Auth (dans apps/web)
vercel deploy --prod                              # déploiement manuel, depuis la racine (sinon : push sur main)
```

Création du propriétaire en production : voir le README.

## Documentation (à lire dans cet ordre)

| Document                                                 | Rôle                                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [docs/decisions-ouvertes.md](docs/decisions-ouvertes.md) | Tout ce qui a été tranché au cadrage : décisions du propriétaire et choix de conception à relire |
| [docs/SPEC.md](docs/SPEC.md)                             | Spec de référence : exigences F-* et NF-*, API, stack, tests, limites                            |
| [docs/GLOSSARY.md](docs/GLOSSARY.md)                     | Vocabulaire à employer partout                                                                   |
| [docs/architecture.md](docs/architecture.md)             | Diagrammes, **formules et règles de calcul (§6)**, modèle de données, écrans                     |
| [docs/adr/](docs/adr/)                                   | 10 décisions d'architecture                                                                      |
| [docs/threat-model.md](docs/threat-model.md)             | Analyse STRIDE, menaces T-01 à T-12, priorités par lot                                           |
| [docs/plans/lot-0.md](docs/plans/lot-0.md)               | Plan du Lot 0 (socle), exécuté                                                                   |
| [docs/plans/lot-1.md](docs/plans/lot-1.md)               | Plan du Lot 1 (séances), exécuté                                                                 |
| [docs/plans/lot-1.1.md](docs/plans/lot-1.1.md)           | Plan du Lot 1.1 (retours du propriétaire), exécuté                                               |
| [docs/plans/lot-2.md](docs/plans/lot-2.md)               | Plan du Lot 2 (stats et suggestions), exécuté                                                    |
| [docs/plans/lot-3.md](docs/plans/lot-3.md)               | Plan du Lot 3 (poids de corps), exécuté                                                          |
| [docs/plans/lot-4.md](docs/plans/lot-4.md)               | Plan du Lot 4 (alimentation), exécuté                                                            |
| [apps/web/DESIGN.md](apps/web/DESIGN.md)                 | Système visuel construit (direction A)                                                           |

En cas de contradiction : `decisions-ouvertes.md` et les ADRs priment, et `SPEC.md` les consolide.

## Règles de travail

- Un lot à la fois. Proposer le plan détaillé du lot et **attendre la validation** avant de coder. Ne jamais commencer le lot suivant sans accord explicite.
- Tests écrits avec le code. Un lot n'est fini que si le lint, les types, les tests et la CI sont verts.
- Toute formule ou règle de calcul vit dans `packages/core`, en TypeScript pur, testée unitairement. Jamais dans un composant, une route ou une requête SQL.
- Toutes les écritures passent par l'API REST `/api/v1`. **Aucune Server Action** (préparation de l'app iPhone, [ADR 0004](docs/adr/0004-api-rest-plutot-que-server-actions.md)).
- Chaque requête est filtrée par l'utilisateur de la session. Le compte démo ne peut rien écrire.
- Budget 0 € : ne jamais ajouter de service payant.
- Aucune saisie de ressenti (décision du propriétaire, D3).
- Aucun secret dans le dépôt (il sera public) : `.env.example` documente chaque variable.
- Commits atomiques en Conventional Commits.
- Exigence ambiguë : poser la question plutôt que deviner.
- Utiliser le vocabulaire de `GLOSSARY.md` (« séance » et non « entraînement », « max estimé » et non « 1RM » dans les textes).

## Au démarrage d'un lot

1. Écrire `docs/plans/lot-<n>.md` (même format que le Lot 0) et le faire valider.
2. Travailler sur une branche `lot-<n>`, ouvrir une PR vers `main`, CI verte avant fusion.
3. Mettre à jour ce fichier (état, commandes) à la fin du lot.
