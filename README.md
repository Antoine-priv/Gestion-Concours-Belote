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
victoires puis aux points, pas de revanche. Tout est modifiable par concours.
