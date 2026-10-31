# MaRoutine

Projet perso et portfolio (profil fullstack) : application web installable (PWA) de suivi de musculation. Le soir, on saisit séance, pesée et alimentation. L'app calcule la progression, suggère la prochaine charge et met les performances en regard de l'alimentation. Next.js full-stack TypeScript, Neon, Vercel, budget 0 €.

## État actuel

- **Phase : conception.** Il n'y a encore aucun code. Maquettes faites, direction visuelle **A — Courbes** retenue (D13, [canevas](https://claude.ai/artifact/WStbXSegxDLEsFJhceFYXC)). Plan du Lot 0 validé, exécution en cours.
- `PRODUCT.md` (racine) est la fiche produit lue par la skill de design impeccable. Au premier écran codé, enregistrer la direction A comme contrat de direction impeccable et produire `DESIGN.md` à la fin.
- Machine de développement : Mac, 8 Go de RAM. Pas de Docker (voir [ADR 0009](docs/adr/0009-base-de-donnees-dev-et-tests.md)).

## Documentation (à lire dans cet ordre)

| Document | Rôle |
|---|---|
| [docs/decisions-ouvertes.md](docs/decisions-ouvertes.md) | Tout ce qui a été tranché au cadrage : décisions du propriétaire et choix de conception à relire |
| [docs/SPEC.md](docs/SPEC.md) | Spec de référence : exigences F-* et NF-*, API, stack, tests, limites |
| [docs/GLOSSARY.md](docs/GLOSSARY.md) | Vocabulaire à employer partout |
| [docs/architecture.md](docs/architecture.md) | Diagrammes, **formules et règles de calcul (§6)**, modèle de données, écrans |
| [docs/adr/](docs/adr/) | 9 décisions d'architecture |
| [docs/threat-model.md](docs/threat-model.md) | Analyse STRIDE, menaces T-01 à T-12, priorités par lot |
| [docs/plans/lot-0.md](docs/plans/lot-0.md) | Plan détaillé du Lot 0 (socle), prêt à exécuter |

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

## Au démarrage du développement

1. ~~Faire les maquettes des écrans~~ : fait, direction A.
2. ~~Écrire et faire valider `docs/plans/lot-0.md`~~ : fait.
3. Tâche 1 du plan : `git init`, déplacer `Docs/` vers `docs/` et figer les versions dans l'[ADR 0001](docs/adr/0001-stack-technique.md).
4. Mettre à jour ce fichier avec les commandes réelles à la fin de chaque lot.
