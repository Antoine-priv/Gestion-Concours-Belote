<script lang="ts">
  // Page statique.
</script>

<h1>Aide</h1>

<section class="carte">
  <h2>Déroulement d'un concours</h2>
  <ol class="etapes">
    <li>
      <strong>Créer le concours</strong> (bouton « Nouveau concours ») : nom, date et règles. Les règles reprennent
      celles du concours précédent.
    </li>
    <li>
      <strong>Inscrire les équipes</strong> dans l'onglet « Inscriptions ». Chaque équipe reçoit un numéro.
      Tapez le début du nom d'un joueur : si son équipe est déjà connue, elle est proposée. Entrée la choisit
      (les deux joueurs sont remplis), puis Entrée l'inscrit. Pour un nouveau joueur, Entrée passe au joueur 2.
    </li>
    <li>
      <strong>Tirage au sort de la partie 1.</strong> Imprimez le tirage pour l'afficher, et les feuilles de table si besoin.
    </li>
    <li>
      <strong>Saisir les points</strong> de chaque table à la fin de la partie : bouton « Saisir les points », puis la touche
      Entrée passe à la table suivante. L'application vérifie que les points concordent.
    </li>
    <li>
      <strong>Tirage de la partie suivante</strong> quand toutes les tables sont saisies. Les équipes sont opposées selon le
      classement (1re contre 2e, 3e contre 4e…), sans jamais rejouer contre la même équipe.
    </li>
    <li><strong>Après la dernière partie</strong> : « Terminer », puis imprimer le classement final avec les lots.</li>
  </ol>
</section>

<section class="carte">
  <h2>La vérification des points</h2>
  <p>À une table, le total des deux équipes est toujours le même :</p>
  <p class="formule">162 × nombre de donnes + 20 par belote + 90 par capot</p>
  <p>
    En 12 donnes sans belote ni capot : 12 × 162 = <strong>1944</strong>. Avec 2 belotes : 1984. Le total finit
    toujours par 4.
  </p>
  <p class="discret">
    Si les points ne concordent pas, l'application l'indique (par exemple une belote oubliée). En cas de doute, on peut
    enregistrer quand même : la table sera marquée « à vérifier ».
  </p>
</section>

<section class="carte">
  <h2>Questions fréquentes</h2>
  <dl>
    <dt>Je me suis trompé dans une saisie.</dt>
    <dd>Cliquez sur la table dans l'onglet de la partie et corrigez : le classement est recalculé tout seul.</dd>
    <dt>Une équipe s'en va en cours de concours.</dt>
    <dd>Dans « Inscriptions », colonne « Abandon » : choisissez à partir de quelle partie elle ne joue plus.</dd>
    <dt>Une équipe arrive en retard.</dt>
    <dd>Inscrivez-la normalement : elle jouera à partir de la partie suivante.</dd>
    <dt>Je veux changer deux équipes de table.</dt>
    <dd>Dans l'onglet de la partie, « Modifier le tirage », puis cliquez sur les deux équipes à échanger.</dd>
    <dt>Le tirage ne convient pas.</dt>
    <dd>« Annuler le tirage de cette partie » en bas de page, puis relancez le tirage.</dd>
    <dt>Afficher sur la télé ou le vidéoprojecteur.</dt>
    <dd>Bouton « Grand écran » : une fenêtre s'ouvre ; faites-la glisser sur l'écran et cliquez « Plein écran ». Elle se met à jour toute seule.</dd>
    <dt>Faire un PDF.</dt>
    <dd>Bouton « Imprimer », puis choisir l'imprimante « Enregistrer au format PDF ».</dd>
  </dl>
</section>

<style>
  .etapes li {
    margin-bottom: 0.5rem;
  }
  .formule {
    font-size: 1.15rem;
    font-weight: 600;
    background: var(--accent-clair);
    padding: 0.6em 1em;
    border-radius: var(--rayon);
    display: inline-block;
  }
  dt {
    font-weight: 600;
    margin-top: 0.7rem;
  }
  dd {
    margin: 0.15rem 0 0 1rem;
  }
</style>
