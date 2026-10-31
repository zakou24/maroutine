---
status: accepted, remplacée en partie par l'ADR 0010 (développement local et e2e)
date: 2026-10-31
---

# Base de développement sur une branche Neon, tests sur PGlite

La machine de développement est un Mac de 8 Go de RAM : on évite Docker. En local, l'app utilise une branche Neon `dev` (les branches sont incluses dans l'offre gratuite). Les tests d'intégration utilisent PGlite, un PostgreSQL compilé en WebAssembly qui tourne dans le processus Vitest et que Drizzle prend en charge. Chaque fichier de test démarre une base vierge et y applique les migrations Drizzle.

## Options écartées

- **PostgreSQL dans Docker** : Docker Desktop consomme à lui seul une bonne part des 8 Go.
- **Testcontainers** : même problème, et plus lent en CI.
- **SQLite pour les tests** : SQL différent de la production (types `numeric`, `date`), donc des tests moins fiables.

## Conséquences

- Les tests ne dépendent pas du réseau, et la CI n'a besoin d'aucun service externe.
- PGlite n'est pas exactement le serveur Neon (extensions, performances). Les tests Playwright de bout en bout tournent contre une branche Neon dédiée.
- Les migrations sont générées par Drizzle Kit et versionnées. On ne fait jamais de `push` direct du schéma sur la production.
