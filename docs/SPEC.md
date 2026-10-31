# Spec : MaRoutine

> Source : [décisions prises pendant le cadrage](decisions-ouvertes.md). Vocabulaire : [GLOSSARY.md](GLOSSARY.md). Architecture détaillée et formules : [architecture.md](architecture.md).

## 1. Objectif

Application web personnelle de suivi de musculation. Le soir, après la salle, on saisit sa séance (exercices, charges, répétitions), sa pesée et son alimentation (calories, protéines). L'app calcule la progression de chaque exercice, suggère la charge de la prochaine séance et met les performances en regard de l'alimentation des jours précédents, pour vérifier si les régressions coïncident avec les périodes où l'alimentation est moins suivie.

**Pourquoi ce projet** : un besoin réel (tout est aujourd'hui « dans la tête »), et une pièce de portfolio pour un profil fullstack. Il démontre une app Next.js full-stack soignée : API REST, modèle de données, authentification, logique métier pure et testée, visualisation de données, PWA installable, le tout à coût nul.

### Utilisateurs

| Rôle | Besoin principal | Accès |
|---|---|---|
| Propriétaire | Saisir ses données chaque soir, suivre sa progression, ajuster ses séances | Compte personnel, lecture et écriture |
| Visiteur démo | Découvrir l'app (recruteur, lead technique) | Bouton « Essayer la démo », lecture seule, données fictives |

Il n'y a pas d'inscription publique ([décision C1](decisions-ouvertes.md#choix-de-conception-à-relire)).

## 2. Carte des capacités

| Module | Responsabilité | Dépend de | Lot |
|---|---|---|---|
| `socle` | Monorepo, Next.js, base, authentification, CI, déploiement, manifeste PWA | — | 0 |
| `seances` | Exercices, séances, séries, préremplissage, calendrier de présence | `socle` | 1 |
| `stats` | Max estimé, meilleure série, volume, tendance, suggestions, fiche exercice | `seances` | 2 |
| `poids` | Pesées, moyenne glissante, courbe | `socle` | 3 |
| `alimentation` | Recherche Open Food Facts, aliments perso, ajout rapide, journal, objectifs | `socle` | 4 |
| `tableau-de-bord` | Vue d'ensemble, croisement alimentation / performance | `stats`, `poids`, `alimentation` | 5 |
| `demo` | Compte démo en lecture seule, générateur de données fictives, vitrine portfolio | tous | 6 |

Ordre de construction : `socle` → `seances` → `stats` → `poids` → `alimentation` → `tableau-de-bord` → `demo`. L'isolation par utilisateur est posée dès le Lot 0.

## 3. Exigences fonctionnelles

Chaque exigence porte un identifiant (`F-<module>-<n>`) repris dans les tests.

### Socle et compte

- **F-SOC-1** : le propriétaire se connecte par email et mot de passe. Il n'existe aucune page d'inscription. Le compte est créé par un script en ligne de commande.
- **F-SOC-2** : la session persiste sur l'iPhone (au moins 30 jours) pour ne pas se reconnecter chaque soir.
- **F-SOC-3** : l'app est installable depuis Safari (« Sur l'écran d'accueil ») et s'ouvre en plein écran avec son icône et son nom.

### Séances

- **F-SEA-1** : le propriétaire crée, modifie, archive et restaure ses exercices : nom, matériel (barre, haltères, machine, poulie, poids du corps, autre), fourchette cible (min et max de répétitions), pas d'augmentation en kg.
- **F-SEA-2** : il crée une séance pour une date (aujourd'hui par défaut), y ajoute des exercices dans un ordre (depuis ses exercices ou le catalogue, D16), et pour chaque exercice des séries `charge × répétitions`. Il coche « Échauffement fait » pour la séance (D14) et note un cardio de fin de séance en minutes (D15).
- **F-SEA-3** : en ajoutant un exercice à une séance, les séries sont **préremplies** avec celles de la dernière séance sur cet exercice. La suggestion de la prochaine séance (F-STA-4) est affichée à côté.
- **F-SEA-4** : il modifie ou supprime une séance passée, un exercice d'une séance ou une série.
- **F-SEA-5** : un calendrier montre les jours de séance, mois par mois, avec le nombre de séances par semaine.
- **F-SEA-6** : plusieurs séances le même jour sont autorisées.

### Statistiques et suggestions

- **F-STA-1** : pour chaque exercice et chaque séance, l'app calcule le **max estimé**, la **meilleure série** et le **volume**, selon les formules de [architecture.md §6](architecture.md#6-calculs-et-statistiques). Les anciennes séries d'échauffement (avant D14) sont exclues.
- **F-STA-2** : la fiche exercice affiche la courbe du max estimé dans le temps (périodes 1 mois, 3 mois, 1 an, tout), le volume par séance et l'historique des séances.
- **F-STA-3** : chaque exercice reçoit une **tendance** : en progression, en stagnation, en régression, inactif, ou « pas assez de données » (règles en [architecture.md §6.4](architecture.md#64-tendance-dun-exercice)).
- **F-STA-4** : la **suggestion** de la prochaine séance (charge et répétitions visées) suit les règles de l'[ADR 0006](adr/0006-suggestions-par-regles.md). Elle est toujours accompagnée de sa justification en une phrase.
- **F-STA-5** : un max estimé calculé sur plus de 12 répétitions est marqué « approximatif ».

### Poids de corps

- **F-POI-1** : le propriétaire saisit une pesée par jour (kg, une décimale). Une nouvelle saisie le même jour remplace la précédente.
- **F-POI-2** : la courbe affiche les pesées et la **moyenne glissante sur 7 jours**.

### Alimentation

- **F-ALI-1** : le propriétaire recherche un aliment par nom dans Open Food Facts et l'ajoute à un repas avec une quantité en grammes. Calories et protéines sont calculées et figées dans l'entrée.
- **F-ALI-2** : il crée ses aliments perso (nom, kcal et protéines pour 100 g) et les retrouve dans la recherche. Ordre des résultats : aliments perso, puis aliments récemment utilisés, puis Open Food Facts.
- **F-ALI-3** : il fait un **ajout rapide** : un libellé, des calories et des protéines, sans aliment.
- **F-ALI-4** : le journal du jour affiche les entrées par repas, les totaux, et la progression vers les objectifs.
- **F-ALI-5** : il définit ses objectifs (kcal et protéines) avec une date d'effet. L'historique des objectifs est conservé.
- **F-ALI-6** : à l'ouverture de la recherche (champ vide), les aliments récemment utilisés sont proposés, pour accélérer la saisie.
- **F-ALI-7** : il peut **dupliquer** les entrées d'un jour précédent ou d'un repas précédent.

### Tableau de bord et croisement

- **F-TDB-1** : le tableau de bord montre en haut le calendrier d'activité des 13 dernières semaines (D17), puis la semaine en cours : séances faites, tendance du poids, jours engagés côté alimentation, exercices regroupés par tendance, et les suggestions des exercices de la dernière séance.
- **F-TDB-2** : sur la fiche exercice, la courbe du max estimé peut être superposée aux calories et protéines quotidiennes.
- **F-TDB-3** : une vue **Croisement** compare la progression moyenne du max estimé après une fenêtre alimentaire engagée et après une fenêtre non engagée, tous exercices confondus et par exercice, avec le nombre de progressions et de séances distinctes de chaque groupe.
- **F-TDB-4** : sous 5 séances distinctes dans l'un des groupes, la vue affiche « pas encore assez de données » et le nombre de séances manquantes, sans aucun chiffre de comparaison.
- **F-TDB-5** : un exercice en régression affiche un signal qui renvoie au poids et à l'alimentation des jours concernés.

### Mode démo

- **F-DEM-1** : la page de connexion propose « Essayer la démo », qui ouvre le compte démo sans mot de passe.
- **F-DEM-2** : le compte démo contient 16 semaines de données générées de façon déterministe, dont une période d'alimentation relâchée suivie d'une régression, pour que chaque écran soit parlant.
- **F-DEM-3** : toute écriture par le compte démo est refusée par l'API (403), ainsi que la recherche d'aliments (`/foods/search`, qui consomme le quota Open Food Facts), et l'interface masque les boutons de saisie avec un bandeau « Mode démo, lecture seule ».

## 4. Exigences non fonctionnelles

| Id | Exigence | Cible | Vérification |
|---|---|---|---|
| NF-1 | Rapidité de saisie | Séance de 5 exercices × 4 séries saisie en moins de 2 min grâce au préremplissage | Test manuel chronométré, scénario Playwright |
| NF-2 | Mobile d'abord | Tous les écrans utilisables à 375 px de large, cibles tactiles ≥ 44 px | Playwright en viewport iPhone |
| NF-3 | Installable | Manifeste valide, icône Apple, affichage `standalone` | Lighthouse PWA, test sur iPhone |
| NF-4 | Coût | 0 € par mois | Revue des offres utilisées ([ADR 0001](adr/0001-stack-technique.md)) |
| NF-5 | Confidentialité | Aucune donnée d'un utilisateur visible par un autre. Le compte démo ne peut rien écrire | Tests d'accès croisé sur chaque route |
| NF-6 | Performance | Tableau de bord affiché en moins de 2 s en 4G avec 2 ans de données (environ 300 séances) | Données générées + mesure Playwright |
| NF-7 | Préparation mobile | Aucune logique métier hors de `packages/core`, aucune Server Action, chaque opération disponible en REST | Revue de code, règle de lint |
| NF-8 | Accessibilité | Contrastes AA, navigation au clavier, chaque graphique accompagné d'un résumé textuel | axe-core dans Playwright |
| NF-9 | Qualité | ≥ 90 % de couverture sur `packages/core`, CI verte | GitHub Actions |
| NF-10 | Open Food Facts | Respect des limites de débit et de l'attribution ODbL | [ADR 0007](adr/0007-alimentation-open-food-facts.md), test du cache |

## 5. API REST

Préfixe `/api/v1`. JSON, validation par schémas Zod partagés dans `packages/core`. L'utilisateur vient toujours de la session, jamais de la requête. Une ressource d'un autre utilisateur répond 404.

| Ressource | Routes |
|---|---|
| Exercices | `GET/POST /exercises`, `GET/PATCH /exercises/{id}` (archivage par `PATCH archived`) |
| Séances | `GET /workouts?from&to`, `POST /workouts`, `GET/PUT/DELETE /workouts/{id}` (la séance complète, exercices et séries compris) |
| Préremplissage | `GET /exercises/{id}/last-sets` |
| Stats | `GET /exercises/{id}/stats?period`, `GET /exercises/{id}/suggestion` |
| Pesées | `GET /body-weights?from&to`, `PUT /body-weights/{date}`, `DELETE /body-weights/{date}` |
| Aliments | `GET /foods/search?q`, `GET /foods/recent`, `POST /foods` (aliment perso), `PATCH/DELETE /foods/{id}` |
| Journal | `GET /food-entries?date`, `POST /food-entries`, `PATCH/DELETE /food-entries/{id}`, `POST /food-entries/copy` |
| Objectifs | `GET /nutrition-targets`, `POST /nutrition-targets` |
| Tableau de bord | `GET /dashboard?week`, `GET /insights/nutrition-performance?exerciseId` |

La séance est écrite en une fois (`PUT` avec toute la structure) : c'est le formulaire du soir qui l'envoie, et ça évite des dizaines d'appels par série.

## 6. Stack technique

Les versions exactes sont fixées au démarrage du Lot 0 (dernières versions stables) et consignées dans [ADR 0001](adr/0001-stack-technique.md).

| Couche | Choix |
|---|---|
| Application | Next.js (App Router), React, TypeScript strict |
| Interface | Tailwind CSS, shadcn/ui, Recharts pour les graphiques |
| Données côté client | TanStack Query pour les appels à l'API |
| Validation | Zod (schémas dans `packages/core`) |
| Base | PostgreSQL Neon (offre gratuite, via l'intégration Vercel Marketplace), Drizzle ORM et migrations Drizzle Kit |
| Authentification | Better Auth (email et mot de passe, inscriptions désactivées, adaptateur Drizzle, plugin Expo disponible pour la suite) |
| Alimentation | API Open Food Facts |
| Hébergement | Vercel, offre Hobby |
| Tests | Vitest, PGlite pour les tests d'intégration, Playwright et axe-core |
| CI | GitHub Actions, gitleaks |
| Outillage | pnpm workspaces, ESLint, Prettier |

## 7. Commandes

Commandes cibles, à confirmer au Lot 0.

```bash
pnpm install
pnpm dev                       # Next.js en local, base = branche Neon de dev
pnpm test                      # Vitest : core + intégration API sur PGlite
pnpm test:e2e                  # Playwright
pnpm lint && pnpm typecheck
pnpm db:generate               # migration Drizzle depuis le schéma
pnpm db:migrate                # applique les migrations sur DATABASE_URL
pnpm create-owner              # crée le compte du propriétaire (email, mot de passe demandés)
pnpm seed:demo                 # (re)génère le compte démo
```

## 8. Structure du dépôt

```
maroutine/
  apps/
    web/                       Next.js
      src/app/                 pages (App Router) et routes /api/v1
      src/server/              services (accès base, appel à core), auth, garde démo
      src/db/                  schéma Drizzle, client
      src/components/          composants d'interface
      drizzle/                 migrations générées
  packages/
    core/                      TypeScript pur, aucune dépendance à Next.js ni à la base
      src/stats/               max estimé, volume, tendance
      src/suggestions/         règles de double progression
      src/nutrition/           totaux, jour engagé, fenêtre alimentaire, croisement
      src/body-weight/         moyenne glissante
      src/schemas/             schémas Zod de l'API
      src/demo/                générateur déterministe de données fictives
  docs/
    adr/
  CLAUDE.md
  .env.example
```

`apps/mobile/` (Expo) viendra s'ajouter plus tard sans modifier `packages/core`.

## 9. Style de code

- **TypeScript** strict, aucun `any`. Fonctions pures dans `core`, nommées par ce qu'elles calculent (`estimateOneRepMax`, `suggestNextSession`).
- **Couches** : route `/api/v1` → service (`src/server/services`) → base et `core`. Les pages serveur peuvent lire via les services. Les écritures passent toujours par l'API.
- **Composants** fonctionnels, hooks `use<Chose>`, appels réseau uniquement via TanStack Query.
- **Nombres** : charges en `numeric(6,2)` en base, converties en `number` à la frontière. Arrondi à l'affichage uniquement.
- **Commits** : Conventional Commits (`feat(stats): compute estimated one-rep max`).
- **Configuration** uniquement par variables d'environnement, documentées dans `.env.example`.

```ts
// packages/core/src/stats/one-rep-max.ts : logique pure, testable sans base ni Next.js
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}
```

## 10. Stratégie de test

| Niveau | Outil | Cible |
|---|---|---|
| Unitaire | Vitest | Tout `packages/core` : formules, règles de suggestion, tendance, jour engagé, croisement, moyenne glissante. Couverture ≥ 90 % |
| Intégration | Vitest + PGlite | Routes API : validation, isolation par utilisateur, refus d'écriture démo, écriture d'une séance complète |
| Bout en bout | Playwright (viewport iPhone) | Connexion, saisie du soir complète, fiche exercice, mode démo |
| Accessibilité | axe-core | Chaque écran |

Les tests d'accès croisé (NF-5) sont obligatoires pour chaque route.

## 11. Limites

- **Toujours** : écrire les tests avec le code. Filtrer chaque requête par l'utilisateur de la session. Mettre la logique de calcul dans `core`. Tenir `CLAUDE.md` à jour.
- **Demander d'abord** : ajouter une dépendance, modifier le schéma de base au-delà du lot en cours, changer une formule ou une règle de suggestion, passer au lot suivant.
- **Jamais** : committer un secret, utiliser une Server Action, mettre un calcul métier dans un composant ou une route, ajouter un service payant, ajouter une saisie de ressenti.

## 12. Critères d'acceptation de la version 1

- [ ] L'app est installée sur l'iPhone du propriétaire et s'ouvre en plein écran
- [ ] Une soirée type (séance, pesée, trois repas) se saisit en moins de 5 minutes
- [ ] La fiche d'un exercice montre la courbe du max estimé et une suggestion justifiée
- [ ] La vue Croisement affiche une comparaison chiffrée, ou indique combien de séances manquent
- [ ] Un visiteur ouvre la démo en un clic et ne peut rien modifier
- [ ] Le coût mensuel est de 0 €
- [ ] CI verte : lint, types, tests core, intégration, e2e

## 13. Hors périmètre

Saisie du ressenti, génération automatique de programmes, fonctions sociales (amis, partage), saisie pendant la séance (chronomètre de repos), lipides, glucides et micronutriments, app iPhone native, mode hors ligne, inscription publique.

## 14. Évolutions possibles

- **App iPhone native (Expo)** : `apps/mobile` réutilise `packages/core` et l'API REST, avec le plugin Expo de Better Auth pour la session. Aucun changement côté serveur.
- **Scan de code-barres** : Safari ne prend pas en charge l'API `BarcodeDetector`. Il faudrait une bibliothèque JavaScript de lecture de code-barres, puis l'appel produit d'Open Food Facts par code.
- **Lipides et glucides** : les colonnes s'ajoutent sans toucher aux règles existantes.
- **Export CSV ou JSON** de toutes les données, pour la portabilité et la sauvegarde.
- **Modèles de séance** (« Push », « Jambes ») pour préremplir une séance entière.
- **Règle bonus « première série »** (décision C12).

## 15. Questions ouvertes

Aucune à ce stade. Les choix de conception à relire sont listés dans [decisions-ouvertes.md](decisions-ouvertes.md#choix-de-conception-à-relire).
