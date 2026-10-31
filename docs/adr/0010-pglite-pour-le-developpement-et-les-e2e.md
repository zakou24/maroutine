---
status: accepted
date: 2026-10-31
---

# PGlite en fichier pour le développement local et les tests e2e

Au Lot 0, la production, les aperçus Vercel et le développement partageaient la même base Neon. Avant les premières saisies réelles (Lot 1), le développement et les tests de bout en bout doivent avoir leur propre base.

On garde PGlite, déjà utilisé pour les tests d'intégration ([ADR 0009](0009-base-de-donnees-dev-et-tests.md)), mais **en fichier** : `DATABASE_URL=pglite:./.data/dev` ouvre une base persistante dans `apps/web/.data/dev`. `getDb()` choisit le pilote selon ce préfixe ; toute autre URL passe par le pilote Neon. Les e2e utilisent `pglite:./.data/e2e`, recréée à chaque lancement par `pnpm e2e:prepare` (migrations et propriétaire de test).

Les migrations de production s'appliquent au build : `pnpm build` lance `scripts/migrate-on-deploy.ts`, qui ne migre que si `VERCEL_ENV=production`, avec `DATABASE_URL_UNPOOLED` (à défaut `DATABASE_URL`).

## Options écartées

- **Branche Neon `dev`** : un compte et un réseau requis pour développer, et une branche de plus à garder synchronisée. L'offre gratuite limite aussi les heures de calcul.
- **PostgreSQL dans Docker** : écarté par l'ADR 0009 (8 Go de RAM).
- **Migrer aussi sur les aperçus** : ils partagent la base de production, une migration de branche non fusionnée la modifierait.

## Conséquences

- Aucun service externe pour développer ni pour la CI. La production est seule sur Neon.
- Une base PGlite n'accepte qu'un processus : arrêter `next dev` avant `db:migrate` ou `create-owner` sur la même base.
- Next.js charge le module de base dans plusieurs paquets serveur : l'instance est gardée sur `globalThis`, sinon deux PGlite ouvriraient le même dossier sans voir leurs écritures respectives.
- PGlite n'est pas exactement Neon : le critère de fin de chaque lot se vérifie en production.
- **Les aperçus Vercel partagent encore la base de production** et n'exécutent aucune migration : ils servent à regarder, jamais à saisir. Une branche de schéma non fusionnée peut y casser des écrans.
