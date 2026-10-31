---
status: accepted
date: 2026-10-31
---

# Stack technique : Next.js full-stack TypeScript, Neon, Vercel

L'app est une seule application Next.js (App Router) en TypeScript, qui sert l'interface React et l'API REST. Les données sont dans PostgreSQL chez Neon, l'accès passe par Drizzle ORM, l'authentification par Better Auth, et l'hébergement est sur Vercel. Le propriétaire voulait du React, un budget nul et un projet de portfolio fullstack : un seul dépôt TypeScript montre à la fois du front, du back, un modèle de données et des tests, et chaque brique a une offre gratuite suffisante pour un utilisateur.

## Options écartées

- **React (Vite) + Supabase** : le plus rapide à monter, mais peu de code back à montrer, et la logique se retrouve en SQL et en règles d'accès plutôt qu'en TypeScript testable.
- **React + API séparée (Node ou Spring Boot)** : deux déploiements, et un back gratuit qui se met en veille avec des démarrages lents, surtout sur la JVM. Spring Boot est déjà montré dans un autre projet du portfolio.

## Offres gratuites utilisées

| Service | Offre | Limite à surveiller |
|---|---|---|
| Vercel | Hobby | Usage personnel non commercial, ce qui est le cas |
| Neon | Free, via l'intégration Vercel Marketplace | Stockage limité (de l'ordre de 0,5 Go par projet), largement suffisant pour des années de données d'une personne |
| GitHub | Dépôt public et Actions | Minutes illimitées pour un dépôt public |
| Open Food Facts | API publique, sans clé | Limites de débit, voir [ADR 0007](0007-alimentation-open-food-facts.md) |

## Versions

Vérifiées sur npm le 31/10/2026, au démarrage du Lot 0.

| Outil | Version | Note |
|---|---|---|
| Node.js | 24 (LTS) | Runtime par défaut de Vercel |
| pnpm | 10.8.1 | |
| Next.js | 16.4.3 | |
| React / React DOM | 19.3.1 | |
| TypeScript | 6.0.3 | La 7.0.2 existe, mais typescript-eslint 8.72 exige TypeScript < 6.1 |
| Tailwind CSS | 4.3.3 | |
| shadcn (CLI) | 4.23.0 | |
| Zod | 4.6.7 | |
| Drizzle ORM / Drizzle Kit | 0.45.4 / 0.31.11 | |
| @neondatabase/serverless | 1.2.0 | |
| Better Auth / CLI `auth` | 1.7.14 | L'ancien `@better-auth/cli` est déprécié |
| Vitest | 5.0.5 | |
| PGlite | 0.5.14 | |
| Testing Library (React) | 16.3.3 | |
| Playwright / axe-core | 1.64.1 / 4.14.0 | |
| ESLint / typescript-eslint | 10.14.0 / 8.72.1 | |
| Prettier | 3.9.10 | |
| tsx | 4.23.15 | |

TanStack Query et Recharts seront figés au premier lot qui les utilise.

## Offres réellement souscrites (31/10/2026)

- **Vercel Hobby** : projet `maroutine`, Node 24.x, fonctions dans la région `cdg1` (Paris), protection de déploiement par défaut (les URL d'aperçu demandent une connexion Vercel).
- **Neon `free_v3`** via la Marketplace Vercel : base `maroutine-db` en `fra1` (Francfort), authentification Neon désactivée. Variables `DATABASE_URL`, `DATABASE_URL_UNPOOLED` et apparentées injectées par l'intégration.
- **GitHub** : dépôt public `zakou24/maroutine`, Actions gratuites.
- Sur Vercel, les variables de production marquées secrètes (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) ne sont pas récupérées par `vercel env pull`.

## Conséquences

- Les limites des offres gratuites (et leurs éventuels changements) sont revues à chaque lot.
- Neon met la base en veille quand elle n'est pas utilisée. La première requête après une pause est un peu plus lente, ce qui est acceptable.
