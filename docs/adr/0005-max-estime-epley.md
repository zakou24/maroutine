---
status: accepted
date: 2026-10-31
---

# Max estimé par la formule d'Epley

Pour comparer des séries faites à des charges et des nombres de répétitions différents, chaque série est convertie en **max estimé** : `charge × (1 + reps / 30)`, et la charge elle-même pour une seule répétition. C'est la courbe principale de progression. Elle fait apparaître comme un progrès aussi bien une répétition de plus qu'une charge plus lourde (exemple du cadrage : 20 × 3 → 22,0 ; 20 × 4 → 22,7 ; 25 × 3 → 27,5).

## Options écartées

- **Charge seule** : 70 kg × 6 puis 70 kg × 10 apparaîtrait comme une stagnation.
- **Formule de Brzycki** : `charge × 36 / (37 − reps)`. Résultats très proches sous 10 répétitions, mais elle diverge quand on approche de 37 répétitions.
- **Moyenne de plusieurs formules** : plus complexe à expliquer, sans gain réel pour suivre une tendance.

## Conséquences

- L'estimation devient imprécise au-delà de 12 répétitions : la valeur est alors marquée « approximative ».
- La meilleure série (chiffre réel) et le volume sont affichés en complément, pour ne pas tout reposer sur une estimation.
- Changer de formule changerait tout l'historique affiché : c'est une décision à reprendre par un nouvel ADR.
