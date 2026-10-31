---
status: accepted
date: 2026-10-31
---

# PWA plutôt qu'app native pour la version 1

Le propriétaire veut garder l'app sur son iPhone, sans budget. L'app est donc une application web installable (PWA) : un manifeste (`app/manifest.ts`), une icône Apple (`apple-touch-icon`) et l'affichage `standalone`. Ajoutée depuis Safari à l'écran d'accueil, elle s'ouvre en plein écran comme une app. La saisie se fait le soir à la maison, donc aucun mode hors ligne n'est nécessaire.

## Options écartées

- **App native publiée sur l'App Store** : compte développeur Apple à 99 € par an et passage en revue, ce qui est contraire au budget zéro.
- **App native installée sans compte payant** : le profil gratuit expire au bout de 7 jours, il faudrait réinstaller depuis un Mac chaque semaine.

## Conséquences

- Pas d'accès à Apple Santé ni aux widgets. Ce n'est pas nécessaire pour cet usage.
- Une app iPhone reste possible plus tard avec React Native et Expo (testable gratuitement avec Expo Go). [ADR 0003](0003-logique-metier-dans-core.md) et [ADR 0004](0004-api-rest-plutot-que-server-actions.md) la préparent.
- Un lien suffit pour présenter l'app dans le portfolio.
