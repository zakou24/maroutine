# MaRoutine

Application web installable (PWA) de suivi de musculation. Le soir, on saisit sa séance, sa pesée et son alimentation ; l'app calcule la progression de chaque exercice (max estimé), suggère la charge de la prochaine séance et met les performances en regard de l'alimentation des jours précédents.

Projet personnel et de portfolio. Next.js full-stack en TypeScript, PostgreSQL Neon, Vercel, budget 0 €.

## Documentation

La conception complète est dans [`docs/`](docs/) : [décisions](docs/decisions-ouvertes.md), [spec](docs/SPEC.md), [architecture et formules](docs/architecture.md), [glossaire](docs/GLOSSARY.md), [ADR](docs/adr/), [modèle de menaces](docs/threat-model.md) et [plans de lot](docs/plans/).

## Démarrer

Prérequis : Node.js 24, pnpm 10, [gitleaks](https://github.com/gitleaks/gitleaks) (`brew install gitleaks`).

```bash
pnpm install
git config core.hooksPath .githooks      # bloque tout commit contenant un secret

cp apps/web/.env.example apps/web/.env.local   # puis renseigner les trois variables
pnpm --filter @maroutine/web db:migrate        # applique les migrations sur DATABASE_URL
pnpm --filter @maroutine/web create-owner      # crée le compte du propriétaire
pnpm --filter @maroutine/web dev
```

Créer le propriétaire en production (une seule fois) : depuis la racine, `vercel env pull apps/web/.env.production.local --environment=production`, puis dans `apps/web` :

```bash
set -a; . ./.env.production.local; set +a
BETTER_AUTH_URL=<url de production> BETTER_AUTH_SECRET=<32 caractères quelconques> pnpm create-owner
rm .env.production.local
```

Les variables marquées secrètes sur Vercel ne sont pas récupérées par `env pull`. Le script n'utilise pas le secret, mais il en a besoin pour démarrer.

## Vérifier

```bash
pnpm lint && pnpm typecheck && pnpm test   # lint, types, tests unitaires et d'intégration (PGlite)
pnpm --filter @maroutine/web test:e2e      # Playwright, formats iPhone et ordinateur
```

## Structure

- `packages/core` : logique métier pure (calculs, règles, schémas Zod), réutilisable par une future app iPhone.
- `apps/web` : l'app Next.js (pages, API REST `/api/v1`, authentification, base de données).
