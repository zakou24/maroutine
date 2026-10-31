# MaRoutine

Vocabulaire de l'app personnelle qui suit les séances de musculation, le poids de corps et l'alimentation, et les met en regard pour comprendre sa progression.

## Personnes

**Propriétaire** :
La personne qui utilise l'app au quotidien. C'est le seul compte réel.
_Avoid_ : Utilisateur (dans les textes métier ; `user` reste le nom technique), Client, Athlète

**Visiteur démo** :
Personne qui découvre l'app par le compte démo, en lecture seule.
_Avoid_ : Invité, Recruteur (c'est un cas d'usage, pas un rôle)

## Entraînement

**Séance** :
Passage à la salle à une date donnée, composé d'exercices réalisés dans un ordre.
_Avoid_ : Workout (sauf dans le code), Entraînement, Session (réservé à la connexion)

**Exercice** :
Mouvement de la liste personnelle du propriétaire (« Développé couché »), avec son matériel, sa fourchette cible et son pas d'augmentation.
_Avoid_ : Mouvement, Exo (à l'oral seulement)

**Matériel** :
Type d'équipement d'un exercice : barre, haltères, machine, poulie, poids du corps, autre.
_Avoid_ : Équipement, Type

**Série** :
Une suite de répétitions faites d'affilée à une charge donnée, notée `charge × répétitions`.
_Avoid_ : Set (sauf dans le code)

**Échauffement** :
Noté une fois pour la séance (« Échauffement fait »), sans détail des séries (D14).
_Avoid_ : Warm-up

**Série d'échauffement** :
Ancienne notion (avant D14) : série marquée comme échauffement. Les séries existantes restent enregistrées et exclues de toutes les stats ; on n'en saisit plus.
_Avoid_ : Série de chauffe, Warm-up

**Cardio** :
Effort d'endurance en fin de séance, noté par sa seule durée en minutes (D15).
_Avoid_ : Cardio training, HIIT (sauf s'il en est question)

**Série de travail** :
Toute série qui n'est pas une ancienne série d'échauffement et compte au moins une répétition. Depuis D14, toute série saisie en est une.
_Avoid_ : Série effective, Working set

**Charge** :
Poids saisi pour une série, en kg. Pour un exercice au poids du corps, c'est le lest.
_Avoid_ : Poids (ambigu avec le poids de corps), Load

**Lest** :
Poids ajouté au corps sur un exercice au poids du corps (ceinture, gilet). Zéro si aucun.
_Avoid_ : Surcharge

**Charge effective** :
Charge utilisée dans les calculs : la charge, ou le poids de corps plus le lest pour un exercice au poids du corps.
_Avoid_ : Charge totale

**Répétition** :
Une exécution complète du mouvement.
_Avoid_ : Rep (à l'oral seulement)

**Fourchette cible** :
Nombre de répétitions visé par série pour un exercice, de la borne basse à la borne haute (6 à 10 par défaut).
_Avoid_ : Plage, Objectif de reps, Rep range

**Pas d'augmentation** :
Charge ajoutée quand la suggestion propose de monter (2,5 kg par défaut).
_Avoid_ : Incrément (sauf dans le code), Palier

## Statistiques

**Max estimé** :
Charge qu'on pourrait soulever une seule fois, estimée à partir d'une série par la formule d'Epley. C'est la mesure principale de progression.
_Avoid_ : 1RM (sauf dans le code), Max théorique, Record

**Meilleure série** :
La série de travail d'une séance au plus grand max estimé, affichée telle que saisie.
_Avoid_ : Record, Top set

**Volume** :
Somme de `charge effective × répétitions` sur les séries de travail d'un exercice dans une séance.
_Avoid_ : Tonnage, Charge de travail

**Tendance** :
État d'un exercice sur ses 6 dernières séances : en progression, en stagnation, en régression, inactif, ou pas assez de données.
_Avoid_ : Statut, Évolution

**Couloir de tendance** :
Bande tracée derrière la courbe du max estimé, du plus petit au plus grand max estimé des 3 dernières séances. Signature visuelle de l'app.
_Avoid_ : Zone de confiance, Intervalle

**Double progression** :
Méthode qui consiste à gagner des répétitions à charge constante jusqu'au haut de la fourchette, puis à monter la charge et repartir du bas.
_Avoid_ : Progression linéaire (qui est une autre méthode)

**Suggestion** :
Charge et répétitions proposées pour la prochaine séance sur un exercice, toujours accompagnées de leur justification.
_Avoid_ : Recommandation, Conseil, Prédiction

## Poids de corps

**Pesée** :
Poids de corps du propriétaire à une date, une seule par jour.
_Avoid_ : Mesure, Poids (seul)

**Moyenne glissante** :
Moyenne des pesées des 7 derniers jours, seule mesure de tendance du poids qui ait du sens.
_Avoid_ : Moyenne mobile, Lissage

## Alimentation

**Aliment** :
Produit avec ses calories et protéines pour 100 g, venant d'Open Food Facts ou créé par le propriétaire (aliment perso).
_Avoid_ : Produit, Ingrédient

**Entrée alimentaire** :
Ce que le propriétaire a mangé à un repas : un aliment et une quantité, ou un ajout rapide. Ses calories et protéines sont figées à l'enregistrement.
_Avoid_ : Repas (qui regroupe plusieurs entrées), Log

**Ajout rapide** :
Entrée alimentaire saisie directement en calories et protéines, sans aliment.
_Avoid_ : Saisie manuelle, Quick add

**Repas** :
Moment de la journée qui regroupe des entrées : petit-déjeuner, déjeuner, dîner, collation.
_Avoid_ : Prise alimentaire

**Objectifs nutritionnels** :
Calories et protéines visées par jour, à partir d'une date d'effet.
_Avoid_ : Macros, Cibles

**Jour renseigné** :
Jour avec au moins une entrée alimentaire.
_Avoid_ : Jour suivi, Jour complet

**Jour engagé** :
Jour renseigné où les protéines atteignent au moins 90 % de l'objectif et les calories restent à ±10 % de l'objectif.
_Avoid_ : Bon jour, Jour réussi, Jour clean

**Fenêtre alimentaire** :
Les trois jours qui précèdent une séance (J-3 à J-1), utilisés pour la rapprocher de l'alimentation.
_Avoid_ : Période, Contexte

**Croisement** :
Comparaison de la progression du max estimé après des fenêtres alimentaires engagées et non engagées.
_Avoid_ : Corrélation (trop fort statistiquement), Analyse

## Usage

**Saisie du soir** :
Le moment où, rentré chez lui, le propriétaire saisit séance, pesée et alimentation de la journée. C'est aussi le nom de l'écran.
_Avoid_ : Journal, Check-in

**Mode démo** :
Accès en lecture seule au compte démo, rempli de données fictives.
_Avoid_ : Mode invité, Bac à sable
