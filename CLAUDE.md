# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

Application de gestion de concours de belote (classique) destinée à un organisateur de concours non technicien. Interface, messages et identifiants de code **en français** : garder cette convention. Svelte 5 (runes) + TypeScript + Vite.

Contraintes qui guident les choix :
- **Hors ligne obligatoire** (salle des fêtes sans Internet). Le build produit **un seul fichier** `dist/index.html` (vite-plugin-singlefile, `base: './'`) ouvert en `file://` dans Chrome sous Windows. Pas de ressource externe (polices, CDN, API), pas de découpage en chunks ni d'`import()` dynamique.
- Une seule personne saisit les points sur un PC.
- Les règles exactes n'ont pas été confirmées par l'organisateur : chaque variante (fin de partie au temps/donnes/score, capot 250/252, points arrondis, annonces, mêlée, critères de départage…) est un **réglage par concours** dans `Reglages`. Ne pas supprimer une variante sans confirmation. Les valeurs par défaut (12 donnes, capot 252, points réels) viennent de la vérification papier de l'organisateur : « les 2 totaux doivent finir par 4 » (162 × 12 = 1944 ; belotes et capots à 252 ne changent pas le dernier chiffre).

## Commandes

```bash
npm run dev                      # serveur de dev (port 5173 via .claude/launch.json)
npm run build                    # → dist/index.html autonome
npm test                         # vitest (logique uniquement)
npx vitest run -t "mêlée"        # un seul test, par nom
npm run check                    # svelte-check : doit rester à 0 erreur ET 0 avertissement
```

TypeScript est volontairement en v6 (svelte-check n'accepte pas la v7). Un composant sans `<script>` fait échouer svelte-check : en mettre un, même vide.

## Architecture

**Logique pure** (`src/lib/*.ts`, sans Svelte, testée dans `logique.test.ts`) :
- `score.ts` — concordance des points d'une table : total = donnes × 162 + 20 × belotes + (capot − 162) × capots + annonces (16/2/25 en points arrondis). Au temps/au score, le nombre de donnes est déduit si le reste est divisible. Modes `complet`, `dernierChiffre` (méthode papier), `aucun`.
- `classement.ts` — `calculerClassement(concours, jusqua?)`. Le classement n'est **jamais stocké** : toujours recalculé depuis les résultats des tables, ce qui rend les corrections a posteriori automatiques. Les points d'exempt sont exclus de la différence.
- `tirage.ts` — partie 1 au hasard, puis système suisse (ordre du classement, appariement par retour arrière borné pour éviter les revanches, repli sur des paires simples), exempts = moins bien classés jamais exemptés. En mêlée : groupes de 4 selon le classement, découpage qui évite les partenaires déjà associés.
- `stats.ts` — statistiques multi-concours ; en mode équipes, ce qui est compté pour l'équipe est attribué à ses deux joueurs.

**Modèle de données** (`types.ts`) — subtilités :
- `Concours.participants[].id` désigne une `Equipe` du registre global en mode `equipes`, un `Joueur` en mode `melee`. Toujours passer par `nomParticipant` / `nomCamp` du store.
- `Table.a` / `Table.b` sont des **tableaux** d'ids de participants : 1 équipe, ou 2 joueurs en mêlée.
- Les résultats vivent uniquement sur `Table.resultat` ; les exempts sur `Partie.exempts`.
- `abandonPartie = n` : ne joue plus à partir de la partie n (`actifs()` garde `abandonPartie > numero`).
- Équipes et joueurs sont réutilisés d'un concours à l'autre (`trouverOuCreerJoueur/Equipe`, nom normalisé sans accents ni casse) pour alimenter les statistiques.

**État et persistance** (`store.svelte.ts`, `stockage.ts`) :
- Un seul état réactif `app.donnees` (type `Donnees`, `version: 1`). Un `$effect.root` sérialise tout en JSON → `localStorage` à chaque changement, et, si l'utilisateur l'a activée, une copie dans un fichier via File System Access API (poignée conservée dans IndexedDB ; Chrome redemande la permission à chaque session → `sauvegarde.aReautoriser`).
- Des données réelles existent déjà chez les utilisateurs : tout changement de schéma doit rester lisible par `valider()` ou passer par une migration.
- Les fonctions pures reçoivent des `$state.snapshot(...)` (ex. `lancerTirage`), pas les proxys.
- Les autres onglets se resynchronisent via l'événement `storage` (écritures identiques ignorées, pour éviter les boucles).

**Navigation et vues** :
- Routage par hash dans `navigation.svelte.ts`, interprété dans `App.svelte` : `#/`, `#/nouveau`, `#/concours/:id/:onglet` (`inscriptions` | `partie-N` | `classement` | `reglages`), `#/joueurs`, `#/stats`, `#/sauvegarde`, `#/aide`, `#/ecran/:id`.
- `#/ecran/:id` est la fenêtre « grand écran » (vidéoprojecteur) : démarrée en **lecture seule** dans `main.ts` (pas d'autosave), rafraîchie par l'événement `storage` et une relecture périodique.
- Impression : `imprimer(vue)` remplit `impression.vue`, `Impression.svelte` s'affiche dans `.zone-impression` (visible uniquement en `@media print`), puis `window.print()`.
- Le chrono est stocké dans `Partie.chrono` sous forme d'horodatages (début / reste en pause), pas de compteur qui tourne.

## Conventions d'interface

- Boutons : **masqués** quand l'action n'a pas de sens dans la situation, **grisés** (`disabled`) quand il manque une saisie pour les activer.
- Saisie rapide au clavier : Entrée enchaîne les étapes (inscription via `ChampSuggestions`, saisie des points table après table).
- La page `Aide.svelte` documente l'usage pour l'organisateur : la mettre à jour quand un parcours change.

## Déploiement

`.github/workflows/deploy.yml` : à chaque push sur `main`, tests + build + publication sur GitHub Pages (https://antoine-priv.github.io/Gestion-Concours-Belote/). La source Pages du dépôt doit être réglée sur « GitHub Actions ». Les données de la version en ligne et celles du fichier `file://` sont séparées (origines différentes) ; on passe de l'une à l'autre avec l'export/import de sauvegarde.
