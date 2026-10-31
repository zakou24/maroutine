---
status: accepted
date: 2026-10-31
---

# API REST plutôt que Server Actions

Toutes les écritures passent par des routes `/api/v1` (Route Handlers Next.js) qui renvoient du JSON. Les Server Actions ne sont pas utilisées : seule l'app web Next.js peut les appeler, alors qu'une future app Expo a besoin d'une API HTTP classique. Les pages serveur peuvent lire via les services pour l'affichage initial, et chaque lecture existe aussi en route `GET`.

## Options écartées

- **Server Actions pour les formulaires** : moins de code côté web, mais tout serait à réécrire en API pour le mobile.
- **tRPC** : typage de bout en bout agréable, mais un client mobile devrait aussi l'utiliser, et l'API serait moins lisible pour un lecteur du portfolio qu'un REST documenté.

## Conséquences

- L'authentification doit fonctionner hors navigateur : Better Auth fournit un plugin Expo pour gérer la session côté mobile.
- Les schémas Zod partagés servent à la fois à valider côté serveur et à typer le client.
- Une règle de revue (et si possible de lint) interdit la directive `"use server"`.
