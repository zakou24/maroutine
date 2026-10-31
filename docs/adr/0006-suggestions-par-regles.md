---
status: accepted
date: 2026-10-31
---

# Suggestions par règles explicites de double progression, sans ressenti

La suggestion de la prochaine séance applique quatre règles fixes, dans l'ordre (détail dans [architecture.md §6.5](../architecture.md#65-suggestion-pour-la-prochaine-séance)) : pas de suggestion sans historique, pas de hausse si le max estimé baisse depuis deux séances, hausse du pas d'augmentation si toutes les séries ont atteint le haut de la fourchette, sinon une répétition de plus. Chaque suggestion affiche la règle qui l'a produite. Le propriétaire ne veut pas saisir de ressenti, qui fausserait les stats : les règles ne reposent que sur les charges et les répétitions.

## Options écartées

- **Ressenti (RPE, répétitions en réserve, « facile / dur »)** : refusé par le propriétaire.
- **Modèle statistique ou IA** : opaque, il demande beaucoup de données et on ne pourrait pas expliquer la suggestion.
- **Règle bonus « première série »** : évoquée au cadrage, non confirmée. Elle pourra s'ajouter comme une cinquième règle.

## Conséquences

- La fourchette cible et le pas d'augmentation sont réglables par exercice (barre, haltères et machines n'ont pas les mêmes pas).
- La règle de baisse renvoie vers le poids et l'alimentation de la période, ce qui relie la suggestion à l'objectif du projet.
- Les règles sont des fonctions pures de `core`, testées cas par cas.
