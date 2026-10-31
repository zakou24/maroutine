---
status: accepted
date: 2026-10-31
---

# Inscriptions fermées et mode démo en lecture seule

L'app n'a pas d'inscription publique : le compte du propriétaire est créé par un script (`pnpm create-owner`), et Better Auth est configuré avec les inscriptions désactivées. Pour les visiteurs du portfolio, un bouton « Essayer la démo » ouvre un compte `is_demo` rempli de 16 semaines de données fictives, générées de façon déterministe par `core` (avec une période d'alimentation relâchée suivie d'une régression, pour que le croisement ait quelque chose à montrer). Une garde côté serveur refuse toute écriture de ce compte (403).

## Options écartées

- **Inscription ouverte** : héberger les données de poids et d'alimentation d'inconnus pose des questions RGPD (données de santé) sans rien apporter au projet.
- **Démo modifiable avec remise à zéro nocturne** : demande une tâche planifiée, et les visiteurs se marchent dessus.
- **Démo entièrement côté navigateur (données en mémoire)** : ne montre ni l'API ni la base, qui sont justement ce qu'un lead technique veut voir.

## Conséquences

- La connexion démo passe par une route dédiée qui crée une session pour le compte démo, sans mot de passe, avec une limite de débit.
- L'interface masque les boutons de saisie en mode démo, mais la garde serveur reste la vraie protection.
- `pnpm seed:demo` régénère le compte démo, avec des dates recalculées par rapport au jour courant. Un workflow GitHub Actions hebdomadaire le relance sur la production pour que la démo paraisse toujours récente. Ce n'est pas une remise à zéro des écritures (il n'y en a pas), seulement un recalage des dates.
- La garde refuse aussi la recherche d'aliments au compte démo, pour ne pas consommer le quota Open Food Facts de l'app.
