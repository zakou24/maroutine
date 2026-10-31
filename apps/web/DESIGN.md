---
name: MaRoutine
description: Carnet de musculation du soir, calme et chiffré (direction A « Courbes »).
colors:
  ground: "#f5f7f9"
  surface: "#ffffff"
  ink: "#172033"
  ink-soft: "#4a5568"
  rule: "#d9e0e8"
  rule-soft: "#e6ebf0"
  muted: "#eef2f6"
  field: "#7d8ba0"
  action: "#1f5fa8"
  action-strong: "#174a84"
  corridor: "#e3ecf7"
  corridor-ink: "#17406f"
  regression: "#b4470e"
  regression-ink: "#8a3409"
  regression-wash: "#fdf3ec"
typography:
  headline:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "34px"
    fontFeature: "tnum"
  title:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "28px"
    fontFeature: "tnum"
  body:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  body-strong:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: "24px"
    fontFeature: "tnum"
  body-sm:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  tab-label:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
rounded:
  surface: "12px"
  check: "4px"
  dot: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.surface}"
    height: "52px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.action-strong}"
  button-primary-compact:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
    rounded: "{rounded.surface}"
    height: "44px"
    padding: "0 16px"
  button-secondary:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.surface}"
    height: "44px"
    padding: "0 16px"
  button-secondary-hover:
    backgroundColor: "{colors.muted}"
  button-ghost-action:
    textColor: "{colors.action}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.surface}"
    height: "44px"
    padding: "0 16px"
  button-add-dashed:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.action}"
    rounded: "{rounded.surface}"
    height: "44px"
    width: "100%"
  button-confirm-delete:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.surface}"
    height: "44px"
    padding: "0 16px"
  icon-button:
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.surface}"
    size: "44px"
  icon-button-hover:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.ink}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.surface}"
    height: "44px"
    padding: "0 10px"
  input-field-prefilled:
    textColor: "{colors.ink-soft}"
  date-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    height: "44px"
    padding: "0 12px"
  checkbox:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.check}"
    size: "20px"
  checkbox-checked:
    backgroundColor: "{colors.action}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.surface}"
    padding: "16px 12px"
  list-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    height: "56px"
    padding: "12px 16px"
  list-row-hover:
    backgroundColor: "{colors.muted}"
  notice-corridor:
    backgroundColor: "{colors.corridor}"
    textColor: "{colors.corridor-ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.surface}"
    padding: "12px 16px"
  tab-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.tab-label}"
    height: "52px"
  tab-bar-item-active:
    textColor: "{colors.action}"
  side-nav:
    backgroundColor: "{colors.surface}"
    width: "240px"
    padding: "24px 12px"
  side-nav-item:
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.surface}"
    height: "44px"
    padding: "0 12px"
  side-nav-item-active:
    backgroundColor: "{colors.corridor}"
    textColor: "{colors.corridor-ink}"
  calendar-day-selected:
    backgroundColor: "{colors.corridor}"
    textColor: "{colors.corridor-ink}"
    rounded: "{rounded.surface}"
    height: "44px"
---

# Design System: MaRoutine

## Overview

**Creative North Star: "Le carnet de chiffres du soir"**

MaRoutine se lit comme un carnet tenu proprement : un fond gris très clair, des feuilles blanches cerclées d'un filet bleu-gris, une encre bleu nuit, et une seule couleur qui agit, le bleu acier. Chaque écran donne une seule réponse (ce que j'ai fait cette semaine, la séance à enregistrer, la liste de mes exercices) et tout le reste se tait. La densité est celle d'un formulaire bien réglé, pas d'un tableau de bord : une colonne, des cartes empilées, des grilles de chiffres alignés.

Le système refuse le tableau de bord de salle de sport saturé de cartes, de jauges et de badges (thèse de la direction A, décision D13). La profondeur vient du contraste fond/surface et du filet, jamais d'une ombre. L'orange brûlé existe dans les jetons mais reste silencieux tant qu'aucune régression de performance n'est calculée (Lot 2) : sa rareté est sa fonction.

La signature prévue, le couloir de tendance (`--corridor`), arrive au Lot 2 avec la fiche exercice. Au Lot 1, c'est la grille de séries tabulaire (N° | Charge × Rép. | Échauffement) qui en tient lieu.

**Key Characteristics:**

- Thème clair uniquement, fond `ground` et surfaces `surface` à filet `rule`.
- Une seule couleur d'action, le bleu acier ; l'orange est réservé aux régressions.
- Atkinson Hyperlegible en deux graisses (400, 700), chiffres tabulaires partout.
- Coins de 12 px sur toute surface dessinée, aucune ombre portée.
- Cibles tactiles de 44 px au moins, champs en 17 px.
- Icônes Lucide au trait de 2 px.

## Colors

Une palette froide et sourde, presque monochrome, où une seule teinte saturée porte l'action.

### Primary

- **Bleu acier** (`action`) : boutons principaux, liens, onglet actif de la barre d'onglets, case cochée, pastille de jour avec séance, icône du bouton date, bouton « Ajouter une série ». C'est la seule couleur qui dit « on peut agir ici ».
- **Bleu acier appuyé** (`action-strong`) : survol des boutons principaux.

### Secondary

- **Voile de couloir** (`corridor`) : fond d'état actif ou sélectionné (élément actif de la barre latérale, jour sélectionné du calendrier, sélection de texte) et du bandeau d'information « Brouillon non enregistré restauré ». Au Lot 2, il deviendra le couloir de tendance des courbes.
- **Encre de couloir** (`corridor-ink`) : texte posé sur le voile de couloir, total hebdomadaire du calendrier, message de confirmation « Séance enregistrée. ».

### Tertiary

- **Orange brûlé** (`regression`), **encre de régression** (`regression-ink`) et **voile de régression** (`regression-wash`) : réservés aux régressions de performance (Lot 2). Aucun écran du Lot 1 ne les emploie.

### Neutral

- **Gris de fond** (`ground`) : fond de page, barre d'enregistrement collante, fond des boutons secondaires, `theme_color` de la PWA.
- **Blanc de feuille** (`surface`) : cartes, listes, champs, barre d'onglets, barre latérale, boîte de dialogue.
- **Encre bleu nuit** (`ink`) : texte courant, titres, messages d'erreur, bouton de confirmation de suppression ; voile de fond de dialogue à 40 %.
- **Encre douce** (`ink-soft`) : textes secondaires, libellés de champ, en-têtes de colonne, valeurs préremplies non modifiées, onglets inactifs, icônes neutres.
- **Filet** (`rule`) : bordure des surfaces, séparateurs de liste, filet de la barre d'onglets et de la barre d'enregistrement.
- **Filet doux** (`rule-soft`) : variante plus pâle du filet, jeton disponible.
- **Gris de survol** (`muted`) : fond au survol des lignes de liste, des boutons icône et des boutons secondaires.
- **Bord de champ** (`field`) : contour des champs, du bouton date, du bouton pointillé et de la case à cocher. Contraste 3,2:1 sur le fond et 3,5:1 sur le blanc (WCAG 1.4.11).

### Named Rules

**The Single Voice Rule.** Le bleu acier est la seule couleur d'action. Rien d'autre que ce qui se touche ne le porte, à l'exception de la pastille d'un jour avec séance.

**The Orange Is Earned Rule.** L'orange brûlé n'apparaît que pour une régression de performance calculée. Les erreurs de saisie et les actions destructives restent à l'encre, accompagnées d'une icône (`destructive` pointe sur `ink`).

**The Prefill Whisper Rule.** Une valeur préremplie depuis la dernière séance s'affiche en encre douce jusqu'à ce qu'on la modifie ; elle passe alors à l'encre pleine. La couleur dit « repris », pas « faux ».

## Typography

**Display Font:** Atkinson Hyperlegible (avec system-ui, sans-serif)
**Body Font:** Atkinson Hyperlegible (avec system-ui, sans-serif)

**Character:** Une seule famille, conçue pour la lisibilité, chargée en 400 et 700 par `next/font`. La hiérarchie vient de la taille et du gras, jamais d'une seconde famille, de capitales ou d'espacement de lettres.

### Hierarchy

- **Headline** (700, 28/34 px) : titre de page (« Cette semaine », « Saisie du soir », « Exercices »), titre de la carte de connexion. Équilibré (`text-wrap: balance`).
- **Title** (700, 20/28 px) : mois du calendrier, titre de la boîte de dialogue, nom de l'app dans la barre latérale.
- **Body** (400, 17 px, interligne 1,5) : texte courant, lignes de liste, valeurs des champs, textes d'état vide.
- **Body strong** (700, 17/24 px) : nom d'exercice dans sa carte et dans la liste, bouton principal, compte de séances.
- **Body small** (400, 15 px, interligne 1,5) : libellés de champ, métadonnées (« 2 exercices · 8 séries », « 6–10 rép. »), ligne « Prérempli depuis le … », boutons secondaires, messages d'erreur (en 700).
- **Label** (400, 13 px, interligne 1,5) : en-têtes de colonne de la grille de séries, initiales des jours du calendrier.
- **Tab label** (400 ou 700 actif, 12/16 px) : libellés de la barre d'onglets, seul usage.

### Named Rules

**The Tabular Rule.** Les chiffres sont tabulaires dans tout le corps de page (`font-variant-numeric: tabular-nums` sur `body`). Charges et répétitions sont alignées à droite dans leur champ pour que les colonnes se lisent d'un trait.

**The Two Weights Rule.** Seules les graisses 400 et 700 sont chargées. Une graisse intermédiaire retombe sur 400 ; l'emphase passe par le 700.

**The No Zoom Rule.** Tout champ de saisie est en 17 px, sur iPhone comme sur ordinateur, pour qu'iOS ne zoome pas au focus.

## Layout

Une seule colonne de contenu de 640 px au plus, centrée. Marges latérales de 16 px sur iPhone, 24 px à partir de 640 px. Haut de page à 32 px (48 px à partir de 768 px). Les blocs d'un écran sont espacés de 20 px ; à l'intérieur d'une carte, 12 px ; entre un libellé et son champ, 8 px.

En dessous de 768 px, une barre d'onglets fixe de 52 px (plus la zone sûre du bas) porte quatre onglets : Semaine, Saisie, Exercices, Plus. Le contenu réserve sa hauteur. À partir de 768 px, elle disparaît au profit d'une barre latérale collante de 240 px, pleine hauteur, séparée du contenu par un filet.

Dans la saisie du soir, le bouton « Enregistrer la séance » vit dans une barre collante (fond `ground`, filet en haut) posée juste au-dessus de la barre d'onglets sur iPhone, en bas de l'écran sur ordinateur.

La grille de séries a des colonnes fixes : N° (24 px), Charge (souple), ×, Rép. (souple, 0,8 fr), Échauffement (44 px), Supprimer (44 px). À partir de 640 px, les colonnes prennent des largeurs fixes (32 px, 144 px, 16 px, 96 px, 44 px, 44 px) alignées à gauche.

**The One Column Rule.** Pas de grille de cartes côte à côte, même sur ordinateur : la colonne de 640 px reste la seule colonne, l'espace libre reste vide.

## Elevation & Depth

Le système est plat. Aucune ombre portée dans les écrans : la profondeur vient du passage du fond `ground` à la surface `surface`, cerclée d'un filet `rule` de 1 px. Les seuls effets de profondeur sont le voile de fond de la boîte de dialogue (encre à 40 %) et le filet supérieur des barres collantes (onglets, enregistrement).

### Named Rules

**The Paper And Rule Rule.** Une surface se distingue par sa couleur et son filet, jamais par une ombre. Si une surface a besoin de se détacher davantage, c'est qu'elle ne devrait pas être une surface.

## Shapes

Coins de 12 px pour toute surface dessinée : cartes, listes, champs, boutons, bouton date, éléments de navigation, cases du calendrier, boîte de dialogue, bandeau d'information. La case à cocher garde un coin de 4 px (petite forme de 20 px), la pastille de jour est un disque de 6 px.

Les bordures sont des filets de 1 px (`rule` pour les surfaces, `field` pour ce qui se remplit). Le bouton « Ajouter un exercice » utilise un filet pointillé `field` : c'est la seule bordure pointillée, et elle signifie « emplacement à remplir ».

Icônes Lucide au trait de 2 px, 20 px dans le contenu et la barre latérale, 24 px dans la barre d'onglets et les flèches de mois, 18 px à côté d'un message d'erreur.

**The Twelve Rule.** Une surface dessinée a des coins de 12 px, sans exception. Pas de pilule, pas d'angle vif.

## Components

### Buttons

Sobres et francs : une seule forme, deux hauteurs, une seule couleur pleine.

- **Shape :** coins de 12 px.
- **Primary :** fond bleu acier, texte blanc en 17 px gras, 52 px de haut (« Enregistrer la séance », « Se connecter », lien « Saisie du soir »). Variante compacte de 44 px en 15 px gras pour l'action de titre (« Nouvel exercice »).
- **Hover / Focus :** survol en bleu acier appuyé ; focus par un anneau de 3 px de bleu acier à 50 % et un bord bleu acier ; enfoncement d'un pixel au clic.
- **Secondary :** fond `ground`, filet `rule`, texte encre en 15 px, 44 px de haut, survol `muted` (« Réessayer », « Annuler », « Restaurer », « Se déconnecter », « Supprimer la séance » avec icône corbeille).
- **Ghost action :** sans fond, texte bleu acier, 44 px, icône « + » (« Ajouter une série », « Créer un exercice »).
- **Ajout pointillé :** pleine largeur, fond blanc, filet pointillé `field`, texte bleu acier gras (« Ajouter un exercice »).
- **Confirmation de suppression :** fond encre, texte blanc gras, dans la boîte de dialogue seulement.
- **Icon button :** carré de 44 px, icône encre douce, survol `muted` et encre ; désactivé à 30 % d'opacité (monter, descendre, retirer, supprimer une série, mois précédent/suivant).

### Cards / Containers

- **Corner Style :** 12 px.
- **Background :** `surface` sur `ground`.
- **Shadow Strategy :** aucune (voir Elevation & Depth).
- **Border :** filet `rule` de 1 px.
- **Internal Padding :** 16 px vertical, 12 px horizontal sur iPhone (16 px à partir de 640 px) pour la carte d'exercice ; 16 px pour le sélecteur d'exercice déplié ; 24 px pour la carte de connexion.

### Lists

Listes groupées dans une seule surface à filet, lignes séparées par des filets `rule`. Ligne de 56 px au moins (64 px pour les exercices), 12 px × 16 px de marge, titre en 17 px, métadonnée en 15 px encre douce, chevron encre douce à droite, survol `muted`. Les exercices archivés sont repliés sous un `details` « Archivés (n) » à chevron qui pivote.

### Inputs / Fields

- **Style :** fond blanc, filet `field`, coins de 12 px, 44 px de haut, texte 17 px. Libellé au-dessus en 15 px encre douce. Les nombres de la grille de séries sont alignés à droite.
- **Focus :** bord bleu acier et anneau de 3 px de bleu acier à 50 %.
- **Prérempli :** valeur en encre douce jusqu'à modification.
- **Error :** bord encre et anneau encre à 20 % (`aria-invalid`), message en 15 px gras encre précédé d'une icône cercle-alerte de 18 px, annoncé par `role="alert"`.
- **Disabled :** opacité 50 %.

### Checkbox (échauffement)

Case de 20 px dans une cible de 44 px, filet de 2 px `field`, coins de 4 px, fond blanc ; cochée, fond et filet bleu acier avec une coche blanche au trait.

### Date button

Sur la ligne du titre de la saisie : bouton de 44 px, filet `field`, fond blanc, icône calendrier bleu acier, date courte en 15 px gras. Un champ date transparent posé dessus ouvre le sélecteur natif.

### Notice

Bandeau d'information en voile de couloir, texte encre de couloir 15 px, coins de 12 px, action soulignée en gras (« Repartir de zéro »).

### Navigation

- **Barre d'onglets (iPhone) :** fond blanc, filet en haut, quatre onglets égaux de 52 px, icône 24 px au-dessus d'un libellé 12 px. Inactif en encre douce, actif en bleu acier gras. Respecte la zone sûre du bas.
- **Barre latérale (ordinateur) :** 240 px, fond blanc, filet à droite, nom « MaRoutine » en 20 px gras, éléments de 44 px en 15 px avec icône 20 px. Actif sur voile de couloir, texte encre de couloir gras ; inactif en encre douce, survol `muted`.

### Calendar

Grille mensuelle dans une surface à filet : initiales des jours en 13 px encre douce, une colonne « Total » de séances par semaine en 15 px gras encre de couloir. Case de jour de 44 px : chiffre en 15 px, pastille bleu acier de 6 px sous le chiffre quand une séance existe (case alors cliquable). Jour sélectionné sur voile de couloir, jour courant en gras, jours hors du mois en encre douce.

### Set grid (signature du Lot 1)

Dans chaque carte d'exercice : nom en 17 px gras et fourchette « 6–10 rép. » en encre douce sur la même ligne, puis la grille N° | Charge (kg) × Rép. | Échauffement | Supprimer, en chiffres tabulaires alignés en colonnes, puis « Prérempli depuis le … » en encre douce, puis la rangée d'actions (ajouter une série à gauche, monter/descendre/retirer à droite). Elle tient lieu du couloir de tendance jusqu'au Lot 2.

## Do's and Don'ts

### Do:

- **Do** poser chaque contenu sur une surface blanche à filet `rule` de 1 px et coins de 12 px, sur le fond `ground`.
- **Do** réserver le bleu acier à ce qui se touche : boutons, liens, onglet actif, case cochée.
- **Do** afficher erreurs et suppressions à l'encre, en gras, avec une icône au trait.
- **Do** garder les champs en 17 px et toute cible tactile à 44 px au moins (52 px pour le bouton principal).
- **Do** aligner les chiffres en colonnes tabulaires, à droite dans les champs numériques.
- **Do** montrer les valeurs préremplies en encre douce jusqu'à leur modification.
- **Do** utiliser des icônes Lucide au trait de 2 px.

### Don't:

- **Don't** utiliser d'ombre portée pour détacher une surface.
- **Don't** utiliser l'orange (`regression`, `regression-ink`, `regression-wash`) pour une erreur, un avertissement ou une suppression : il est réservé aux régressions de performance.
- **Don't** introduire une seconde couleur d'action ni une seconde famille de caractères.
- **Don't** arrondir une surface autrement qu'à 12 px (pas de pilule, pas d'angle vif).
- **Don't** juxtaposer des cartes en grille : une seule colonne de 640 px au plus.
- **Don't** ajouter de thème sombre sans décision : l'app est en thème clair uniquement.
