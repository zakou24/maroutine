---
status: accepted
date: 2026-10-31
---

# Alimentation : Open Food Facts, cache local, valeurs figées

Les aliments viennent de l'API publique d'Open Food Facts (gratuite, sans clé), complétée par des aliments perso et des ajouts rapides. L'appel se fait **côté serveur** (`/api/v1/foods/search`), avec un `User-Agent` identifiant l'app comme le demande Open Food Facts. Chaque produit utilisé est mis en cache dans la table `food`. Une entrée alimentaire **fige** ses calories et protéines à l'enregistrement.

## Options écartées

- **Appel direct depuis le navigateur** : ni cache ni contrôle du débit, et le `User-Agent` ne peut pas être fixé.
- **Base d'aliments importée en entier** : l'export Open Food Facts pèse plusieurs gigaoctets, bien au-delà de l'offre gratuite de Neon.
- **API commerciales (Nutritionix, Edamam…)** : clés et limites payantes, contraires au budget.
- **Calcul des valeurs à la lecture depuis l'aliment** : corriger un aliment modifierait l'historique et fausserait le croisement.

## Conséquences

- **Limites de débit** : Open Food Facts publie des limites par minute, plus strictes pour la recherche que pour la lecture d'un produit. Vérifié au Lot 4 (01/11/2026) : 10 recherches par minute et par IP ; la recherche plein texte passe par Search-a-licious (`search.openfoodfacts.org`), avec un `User-Agent` de la forme `MaRoutine/1.0 (URL du dépôt)`. L'app s'en tient à 6 appels par minute et par utilisateur, et une variable `OPEN_FOOD_FACTS=off` coupe l'appel pour les tests. Depuis le Lot 4.1 (D29), un code-barres scanné est lu par l'API produit (`world.openfoodfacts.org/api/v2/product/{code}`, 100 lectures par minute et par IP publiées) : l'app s'en tient à 20 codes par minute et par utilisateur, et le cache `food` répond d'abord. La recherche locale passe en premier, l'appel externe n'a lieu que s'il y a peu de résultats locaux, et la saisie est temporisée côté interface (debounce).
- **Qualité des données** : les produits sans calories ou protéines pour 100 g sont écartés. Les aliments perso permettent de corriger un produit mal renseigné.
- **Licence** : les données sont sous licence ODbL. L'attribution à Open Food Facts figure dans l'écran Réglages et sous les résultats de recherche.
- **Indisponibilité** : au-delà de 3 s, les seuls résultats locaux sont renvoyés avec un avertissement.
