---
version: 1
slug: "src-app-app"
primary_target: "src/app/(app)"
related_targets: []
---

# Surface : application (Semaine, Saisie du soir, Exercices, Calendrier, Plus)

Mode : **Operate**. Le propriétaire, le soir chez lui, iPhone en main (parfois sur ordinateur), saisit la séance du jour puis vérifie sa semaine. Tâche principale : enregistrer une séance de 5 exercices en moins de 2 minutes grâce au préremplissage. Contraintes : interface en français, vocabulaire du glossaire, aucune saisie de ressenti, cibles ≥ 44 px, champs en 17 px (pas de zoom iOS), PWA plein écran avec zones sûres.

Direction choisie avec le propriétaire : **A — Courbes** (décision D13, canevas https://claude.ai/artifact/WStbXSegxDLEsFJhceFYXC). Construction pilotée par le code (pas de maquette générée).

Décisions ouvertes : la fiche exercice et le couloir de tendance arrivent au Lot 2 ; le tableau de bord complet au Lot 5.

## Direction contract

THESIS: un carnet de chiffres calme où chaque écran donne une seule réponse ; on refuse le tableau de bord de salle de sport saturé de cartes, de jauges et de badges.

OWN-WORLD: fond gris très clair, surfaces blanches à filet fin bleu-gris, encre bleu nuit, une seule couleur d'action bleu acier ; l'orange brûlé n'apparaît que pour une régression. Atkinson Hyperlegible, chiffres tabulaires alignés en colonnes, coins de 12 px, aucune ombre portée, icônes au trait de 2 px.

STORY: le propriétaire comprend en un coup d'œil ce qu'il a fait cette semaine, croit les chiffres parce qu'ils viennent de sa saisie, et enregistre sa séance en ne changeant que ce qui a changé.

FIRST VIEWPORT: Saisie du soir sur iPhone : titre et bouton date en haut, puis les cartes d'exercice en pile (nom en gras, fourchette à droite, grille Série | Charge × Répétitions préremplie), ligne « Prérempli depuis le … » sous chaque carte ; bouton « Enregistrer la séance » fixé au-dessus de la barre d'onglets. Sur ordinateur, barre latérale de 240 px et colonne de contenu de 640 px au plus.

FORM: direction A, première de la liste ordonnée des quatre directions présentées. seed:ed22938663351148. Signature : le couloir de tendance (Lot 2) ; au Lot 1, la grille de séries tabulaire en tient lieu.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
