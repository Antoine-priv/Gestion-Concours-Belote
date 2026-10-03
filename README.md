# Concours de belote

Application web pour organiser un concours de belote : inscriptions, tirage des tables,
saisie et vérification des points, classement (système suisse), statistiques.

Elle fonctionne **sans Internet ni serveur** : tout tient dans un seul fichier HTML.

## Installer chez l'utilisateur

```bash
npm install
npm run build
```

Copier `dist/index.html` sur l'ordinateur (par exemple sur le Bureau, renommé
`Belote.html`), puis l'ouvrir en double-cliquant, avec Google Chrome.

Les données sont enregistrées dans le navigateur (`localStorage`). Le menu **Sauvegarde**
permet en plus une copie automatique dans un fichier (Chrome/Edge) et une copie manuelle.

> Les données sont liées au chemin du fichier : si l'on déplace ou renomme `index.html`,
> Chrome le considère comme une autre application. Exporter puis réimporter une sauvegarde
> permet de les récupérer.

## Version en ligne (GitHub Pages)

Chaque envoi sur la branche `main` lance les tests, reconstruit l'application et la
publie sur GitHub Pages (`.github/workflows/deploy.yml`). À activer une fois dans le dépôt :
**Settings → Pages → Source : GitHub Actions**.

Les données restent dans le navigateur de chaque ordinateur : rien n'est envoyé sur GitHub.
La version en ligne et le fichier `index.html` ont chacun leurs propres données ; on passe
de l'une à l'autre avec la sauvegarde (Télécharger une copie / Restaurer).

## Développer

```bash
npm run dev     # serveur de développement
npm test        # tests de la logique (points, classement, tirage)
npm run check   # vérification des types
```

| Dossier | Contenu |
|---|---|
| `src/lib/score.ts` | Vérification de la concordance des points |
| `src/lib/classement.ts` | Calcul du classement et départage |
| `src/lib/tirage.ts` | Tirage au sort et appariement (sans revanche, exempts, mêlée) |
| `src/lib/store.svelte.ts` | État de l'application et sauvegarde |
| `src/lib/stats.ts` | Statistiques multi-concours |
| `src/pages`, `src/components` | Interface (Svelte 5) |

## Règles par défaut

4 parties de 12 donnes, belote classique, capot à 252, points réels, classement aux
victoires puis aux points, pas de revanche. Tout est modifiable par concours (fin de
partie au temps ou au score, capot à 250, points arrondis, annonces, concours à la mêlée,
critères de départage, points de l'équipe exempte, lots…).

### Vérification des points

À une table, le total des deux équipes est connu d'avance :

```
total = 162 × donnes + 20 × belotes + 90 × capots (capot à 252)
```

En 12 donnes, il vaut 1944 sans bonus et finit donc toujours par 4. L'application refuse
une saisie qui ne concorde pas et suggère la cause probable (belote ou capot oublié) ;
on peut forcer l'enregistrement, la table est alors marquée « à vérifier ».
Pour une partie au temps, le nombre de donnes est retrouvé à partir des points.
