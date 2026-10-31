---
status: accepted
date: 2026-10-31
---

# Logique métier dans `packages/core`, monorepo pnpm

Toutes les formules (max estimé, volume, tendance, moyenne glissante, jour engagé, croisement), les règles de suggestion, les schémas Zod de l'API et le générateur de données de démo vivent dans `packages/core`, un module TypeScript pur sans dépendance à Next.js ni à la base. Le dépôt est un monorepo pnpm (`apps/web`, `packages/core`, plus tard `apps/mobile`). L'app iPhone pourra réutiliser ces calculs tels quels, et c'est la partie la plus simple à tester exhaustivement.

## Options écartées

- **Calculs dans les services de `apps/web`** : plus simple au départ, mais à dupliquer ou extraire le jour où arrive l'app mobile.
- **Calculs en SQL** : performants, mais peu lisibles, difficiles à tester et impossibles à réutiliser côté mobile.
- **Turborepo** : inutile pour deux paquets. Il pourra être ajouté si le build devient lent.

## Conséquences

- Les services chargent les données brutes et appellent `core`. Avec quelques centaines de séances, le calcul en mémoire est instantané.
- Une règle ESLint interdit à `core` d'importer autre chose que Zod.
- Couverture visée sur `core` : 90 % ou plus.
