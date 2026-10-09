# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

Application de gestion de concours de belote (classique) destinée à un organisateur de concours non technicien. Interface, messages et identifiants de code **en français** : garder cette convention. Svelte 5 (runes) + TypeScript + Vite.

Contraintes qui guident les choix :
- **Hors ligne obligatoire** (salle des fêtes sans Internet). Le build produit **un seul fichier** `dist/index.html` (vite-plugin-singlefile, `base: './'`) ouvert en `file://` dans Chrome sous Windows. Pas de ressource externe (polices, CDN, API), pas de découpage en chunks ni d'`import()` dynamique.
- Une seule personne saisit les points sur un PC.
- Règles **confirmées et figées** par l'organisateur (constantes dans `reglages.ts`, pas des options) : équipes formées uniquement, 4 parties (on peut terminer plus tôt ou ajouter une partie une fois le concours lancé), 12 donnes, capot 252, belote 20, pas d'annonces, points réels, vérification complète, partie 1 au sort puis tirage selon le classement, classement au **total des points**, tables numérotées à partir de 1. Ne pas réintroduire ces options (temps/score, chrono, mêlée, lots… ont été supprimés à sa demande). Vérification papier de l'organisateur : « les 2 totaux doivent finir par 4 » (162 × 12 = 1944 ; belotes et capots à 252 ne changent pas le dernier chiffre).
- Seuls réglages par concours (`Reglages`) : critères de départage (défaut : tirage au sort seul), éviter les revanches (défaut oui), points de l'exempte (défaut : moitié = 972 ; option : moyenne de la partie), exempte comptée gagnante (défaut non, n'affecte que les stats). Un nouveau concours part toujours de `reglagesParDefaut()`.

## Commandes

```bash
npm run dev                      # serveur de dev (port 5173 via .claude/launch.json)
npm run build                    # → dist/index.html autonome
npm test                         # vitest (logique uniquement)
npx vitest run -t "rattrapage"   # un seul test, par nom
npm run check                    # svelte-check : doit rester à 0 erreur ET 0 avertissement
```

TypeScript est volontairement en v6 (svelte-check n'accepte pas la v7). Un composant sans `<script>` fait échouer svelte-check : en mettre un, même vide.

## Architecture

**Logique pure** (`src/lib/*.ts`, sans Svelte, testée dans `logique.test.ts`) :
- `score.ts` — concordance des points d'une table : total = 1944 + 20 × belotes + 90 × capots ; en cas d'écart, suggère la cause (belote/capot oublié).
- `classement.ts` — `calculerClassement(concours, jusqua?)`. Le classement n'est **jamais stocké** : toujours recalculé depuis les résultats, ce qui rend les corrections a posteriori automatiques. `scoresComptes(partie)` est la source unique de « ce qui compte » (tables + rattrapage de l'exempte), utilisée aussi par `stats.ts`. Les points d'exempt sont exclus de la différence.
- `tirage.ts` — partie 1 au hasard, puis système suisse (ordre du classement, appariement par retour arrière borné pour éviter les revanches, repli sur des paires simples) ; exempte = moins bien classée jamais exemptée.
- `stats.ts` — statistiques multi-concours ; ce qui est compté pour une équipe est attribué à ses deux joueurs.
- `migration.ts` — conversion des sauvegardes `version: 1` (ancien modèle très configurable ; concours « mêlée » écartés). Testée.

**Modèle de données** (`types.ts`) — subtilités :
- `Concours.participants[].id`, `Table.a`/`Table.b`, `Partie.exempt` sont des ids d'`Equipe` du registre global (nom via `nomParticipant(id)`).
- Les résultats vivent uniquement sur `Table.resultat` et `Partie.rattrapage.resultat`.
- **Rattrapage** : l'exempte peut jouer contre une équipe qui a fini tôt (`Partie.rattrapage = { adversaire, resultat }`, camp `a` du résultat = l'exempte). L'exempte garde alors son vrai score au lieu des points d'office ; l'adversaire joue « pour du beurre » (aucun effet sur ses points, ses stats, ni sur l'anti-revanche). Une partie n'est complète que si son rattrapage éventuel est saisi.
- `abandonPartie = n` : ne joue plus à partir de la partie n (`actifs()` garde `abandonPartie > numero`).
- Équipes et joueurs sont réutilisés d'un concours à l'autre (`trouverOuCreerJoueur/Equipe`, nom normalisé sans accents ni casse) pour alimenter les statistiques.

**État et persistance** (`store.svelte.ts`, `stockage.ts`) :
- Un seul état réactif `app.donnees` (type `Donnees`, `version: 2`). Un `$effect.root` sérialise tout en JSON → `localStorage` à chaque changement, et, si l'utilisateur l'a activée, une copie dans un fichier via File System Access API (poignée conservée dans IndexedDB ; Chrome redemande la permission à chaque session → `sauvegarde.aReautoriser`).
- Des données réelles existent déjà chez les utilisateurs : tout changement de schéma passe par `valider()` + une migration dans `migration.ts` (incrémenter `version`).
- Les fonctions pures reçoivent des `$state.snapshot(...)` (ex. `lancerTirage`), pas les proxys.
- Les autres onglets se resynchronisent via l'événement `storage` (écritures identiques ignorées, pour éviter les boucles).

**Navigation et vues** :
- Routage par hash dans `navigation.svelte.ts`, interprété dans `App.svelte` : `#/`, `#/nouveau`, `#/concours/:id/:onglet` (`inscriptions` | `partie-N` | `classement` | `reglages`), `#/joueurs`, `#/stats`, `#/sauvegarde`, `#/aide`, `#/ecran/:id`.
- `#/ecran/:id` est la fenêtre « grand écran » (vidéoprojecteur) : démarrée en **lecture seule** dans `main.ts` (pas d'autosave), rafraîchie par l'événement `storage` et une relecture périodique.
- Impression : `imprimer(vue)` remplit `impression.vue`, `Impression.svelte` s'affiche dans `.zone-impression` (visible uniquement en `@media print`), puis `window.print()`.

## Conventions d'interface

- Boutons : **masqués** quand l'action n'a pas de sens dans la situation, **grisés** (`disabled`) quand il manque une saisie pour les activer.
- Saisie rapide au clavier : Entrée enchaîne les étapes (inscription via `ChampSuggestions`, saisie des points table après table).
- La page `Aide.svelte` documente l'usage pour l'organisateur : la mettre à jour quand un parcours change.

## Déploiement

`.github/workflows/deploy.yml` : à chaque push sur `main`, tests + build + publication sur GitHub Pages (https://antoine-priv.github.io/Gestion-Concours-Belote/). La source Pages du dépôt doit être réglée sur « GitHub Actions ». Les données de la version en ligne et celles du fichier `file://` sont séparées (origines différentes) ; on passe de l'une à l'autre avec l'export/import de sauvegarde.
