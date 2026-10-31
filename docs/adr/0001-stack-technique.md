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

Fixées au démarrage du Lot 0 (dernières versions stables) et consignées ici avec leur date de vérification : Node.js (LTS), pnpm, Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Recharts, TanStack Query, Zod, Drizzle ORM et Drizzle Kit, Better Auth, Vitest, PGlite, Playwright.

## Conséquences

- Les limites des offres gratuites (et leurs éventuels changements) sont revues à chaque lot.
- Neon met la base en veille quand elle n'est pas utilisée. La première requête après une pause est un peu plus lente, ce qui est acceptable.
