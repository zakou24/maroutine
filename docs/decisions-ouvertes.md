# Décisions prises avant le développement

Ce qui a été tranché pendant la phase de cadrage, le 31/10/2026. Il n'y a pas de cahier des charges d'origine : ce document en tient lieu, et [SPEC.md](SPEC.md) le consolide.

Chaque décision indique sa source :
- **Propriétaire** : décidée par le propriétaire du projet pendant le cadrage.
- **Conception** : choix de conception proposé pendant la rédaction, à relire. Il peut être changé sans remettre en cause le reste.

## Contexte du projet

- **Besoin** : aujourd'hui, les performances à la salle ne sont notées nulle part (« tout est dans la tête »). L'objectif est de les suivre pour optimiser les séances. *(Propriétaire)*
- **Intuition à vérifier** : les périodes de régression correspondent aux périodes où l'alimentation est moins suivie. L'app doit permettre de mettre les deux côte à côte. *(Propriétaire)*
- **Finalité** : projet perso, et pièce de portfolio pour un profil de développeur fullstack. *(Propriétaire)*
- **Phase actuelle** : conception (documentation), puis maquettes, puis développement lot par lot.

## Décisions du propriétaire

| # | Sujet | Décision |
|---|---|---|
| D1 | Moment de saisie | **Le soir, chez soi**, après la séance : séance, pesée et alimentation de la journée. Pas de saisie pendant la séance. |
| D2 | Contenu d'une séance | Date, exercices, et pour chaque série la **charge et le nombre de répétitions**. |
| D3 | Ressenti | **Aucun ressenti saisi** (ni RPE, ni « facile / dur »). Il fausserait l'analyse. Toutes les stats reposent sur des chiffres objectifs. |
| D4 | Stats de progression | **Max estimé** (formule d'Epley), **meilleure série** et **volume**. Voir [ADR 0005](adr/0005-max-estime-epley.md). |
| D5 | Suggestions | L'app suggère la charge et les répétitions de la prochaine séance selon des **règles de double progression explicites**. Voir [ADR 0006](adr/0006-suggestions-par-regles.md). |
| D6 | Poids de corps | Une pesée par jour, saisie le soir. |
| D7 | Alimentation | **Suivi complet des calories et des protéines**, à essayer en version complète quitte à alléger ensuite. |
| D8 | Plateforme | **Application web installable (PWA)**, utilisable comme une app sur iPhone. Pas d'app native en version 1. Voir [ADR 0002](adr/0002-pwa-plutot-qu-app-native.md). |
| D9 | App iPhone native | **Évolution possible** avec React Native et Expo. Le code est organisé dès le départ pour la permettre. |
| D10 | Budget | **0 €**. Uniquement des offres gratuites. Pas de compte développeur Apple. |
| D11 | Stack | **Next.js full-stack en TypeScript**, PostgreSQL Neon, hébergement Vercel (option A du cadrage). Voir [ADR 0001](adr/0001-stack-technique.md). |
| D12 | Préparation mobile | Trois règles : logique métier dans un module TypeScript pur, **API REST** (pas de Server Actions), authentification compatible Expo. Voir [ADR 0003](adr/0003-logique-metier-dans-core.md) et [ADR 0004](adr/0004-api-rest-plutot-que-server-actions.md). |
| D13 | Direction visuelle | **A — Courbes**, choisie le 31/10/2026 parmi 4 directions maquettées ([canevas](https://claude.ai/artifact/WStbXSegxDLEsFJhceFYXC)). Fond clair, encre bleu marine, une seule couleur d'action (bleu `#1F5FA8`), orange réservé à la régression, police Atkinson Hyperlegible, chiffres tabulaires. Signature : chaque courbe (max estimé, poids) est tracée dans un **couloir de tendance**, à la manière d'une courbe de croissance. Consigne du propriétaire : minimaliste, aller à l'essentiel. |
| D14 | Échauffement | Noté **une fois pour la séance** : case « Échauffement fait » (31/10/2026, retours après le Lot 1). Remplace la case par série de C4 ; toutes les séries saisies comptent dans les stats. Les anciennes séries marquées échauffement restent exclues. |
| D15 | Cardio | Facultatif, en fin de séance : durée en minutes (1 à 180), par choix rapides 10, 15, 20 min ou « Autre ». Pas de type de cardio. |
| D16 | Catalogue d'exercices | 40 exercices courants en français, rangés par muscle, à cocher dans Exercices et à choisir dans la séance, pour ne pas taper les noms un par un. Le pas d'augmentation n'est plus demandé à la création (valeur du matériel), il reste dans les réglages. |
| D17 | Calendrier d'activité | Sur l'accueil, au-dessus de la place du poids : les 13 dernières semaines façon GitHub, aux couleurs de la direction A. Onglet et titre « Accueil » ; « Saisie » devient « Séance ». |

## Choix de conception (à relire)

| # | Sujet | Choix | Pourquoi |
|---|---|---|---|
| C1 | Qui peut s'inscrire | **Inscriptions fermées.** Le compte du propriétaire est créé par un script. | Ne pas héberger les données de santé d'inconnus (RGPD), budget zéro. |
| C2 | Visite d'un recruteur | **Mode démo en lecture seule** : un bouton « Essayer la démo » ouvre un compte rempli de 16 semaines de données fictives. Toute écriture est refusée. Voir [ADR 0008](adr/0008-mode-demo-et-inscriptions-fermees.md). | Montrer l'app sans exposer les vraies données, sans tâche de remise à zéro. |
| C3 | Exercices | **Liste personnelle**, créée au fil de l'eau. Chaque exercice a un type de matériel, une **fourchette cible** (6–10 par défaut) et un **pas d'augmentation** (2,5 kg par défaut). | Pas de catalogue imposé. Le pas dépend du matériel. |
| C4 | Séries d'échauffement | ~~Case optionnelle « échauffement » sur une série, exclue des stats.~~ **Remplacée par D14** (31/10/2026) : l'échauffement se note pour la séance. Les séries déjà marquées restent exclues des stats. | Les échauffements faisaient chuter le volume moyen ; le propriétaire préfère ne pas les détailler. |
| C5 | Exercices au poids du corps | La charge saisie est le **lest** (0 si aucun). Le max estimé utilise **poids de corps + lest**, avec la dernière pesée datée entre J-14 et J (le jour même compris, puisque la pesée est saisie le soir). Sans pesée dans cet intervalle, la séance n'a pas de max estimé ni de volume pour cet exercice : elle est exclue de la tendance, de la règle de baisse et du croisement, et la stat affichée est la meilleure série en répétitions. | Rend tractions et dips comparables dans le temps, et relie l'exercice au suivi du poids. |
| C6 | Saisie alimentaire | Trois façons d'ajouter : **recherche Open Food Facts**, **aliment perso** (valeurs pour 100 g), **ajout rapide** (calories et protéines directement). Les valeurs sont **figées** dans l'entrée. Voir [ADR 0007](adr/0007-alimentation-open-food-facts.md). | Complet sans être lourd, et l'historique ne change pas si un aliment est corrigé. |
| C7 | Repas | Quatre repas : petit-déjeuner, déjeuner, dîner, collation. | Classement standard, utile pour se repérer dans la journée. |
| C8 | Objectifs nutritionnels | Objectif de **calories** et de **protéines** par jour, avec une date d'effet (un historique des objectifs). | Les anciens jours restent jugés sur l'objectif de l'époque. |
| C9 | Jour engagé | Un jour est **engagé** si les protéines atteignent au moins 90 % de l'objectif **et** les calories restent à ±10 % de l'objectif. Un jour sans aucune entrée est **non renseigné** et ne compte ni comme engagé ni comme non engagé. | Distinguer « j'ai mal mangé » de « j'ai oublié de noter ». |
| C10 | Croisement alimentation / perf | Chaque séance est rapprochée de la **fenêtre alimentaire** J-3 à J-1. Voir [architecture.md §6](architecture.md#6-calculs-et-statistiques). | L'effet de l'alimentation est décalé dans le temps. |
| C11 | Prudence statistique | Pas de conclusion sous **5 séances par groupe**. Formulation descriptive, jamais causale (« après des jours engagés, ton max estimé a progressé en moyenne de… »). | Peu de données, et le sommeil ou le stress ne sont pas mesurés. |
| C12 | Règle bonus « première série » | **Non retenue en version 1.** | Évoquée au cadrage sans confirmation explicite. Elle peut s'ajouter plus tard sans changer le modèle. |
| C13 | Unités et fuseau | Kilogrammes, grammes, kilocalories. Les dates de séance, de pesée et de repas sont des **dates calendaires** (sans heure), fuseau Europe/Paris. | La saisie se fait le soir, pour la journée écoulée. |
| C14 | Développement sans Docker | Base de développement : une **branche Neon** gratuite. Tests : **PGlite** (PostgreSQL en mémoire). Voir [ADR 0009](adr/0009-base-de-donnees-dev-et-tests.md). | Machine de développement : Mac 8 Go de RAM. |
| C15 | Unité de comptage du croisement | Une **progression** = un exercice dans une séance, comparé à la séance précédente sur le même exercice. « Tous exercices » = moyenne de toutes les progressions. Le seuil de prudence porte sur le nombre de **séances distinctes** (au moins 5 par groupe), et l'écran affiche les deux effectifs. | Une séance de 5 exercices ne doit pas suffire à elle seule à franchir le seuil. |
| C16 | Fraîcheur de la démo | Un workflow GitHub Actions hebdomadaire relance `pnpm seed:demo` sur la production pour recaler les dates. | Sans ça, la démo passe en « inactif » au bout de 30 jours. Gratuit, et sans remise à zéro des écritures puisque la démo est en lecture seule. |
