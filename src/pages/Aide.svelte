<script lang="ts">
  // Page statique.
</script>

<h1>Aide</h1>

<section class="carte">
  <h2>Déroulement d'un concours</h2>
  <ol class="etapes">
    <li>
      <strong>Créer le concours</strong> (bouton « Nouveau concours ») : nom, date et lieu. On arrive directement sur
      les inscriptions. Le concours se joue en 4 parties de 12 donnes, classement au total des points.
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
    <li>
      <strong>Après la 4e partie</strong> : « Terminer », puis imprimer le classement final. En cas d'imprévu, on peut
      aussi terminer plus tôt ou ajouter une partie.
    </li>
  </ol>
</section>

<section class="carte">
  <h2>La vérification des points</h2>
  <p>À une table, le total des deux équipes est toujours le même :</p>
  <p class="formule">1944 (12 donnes × 162) + 20 par belote + 90 par capot</p>
  <p>Avec 2 belotes : 1984. Avec un capot : 2034. Le total finit toujours par 4.</p>
  <p class="discret">
    Si les points ne concordent pas, l'application l'indique (par exemple une belote oubliée). En cas de doute, on peut
    enregistrer quand même : la table sera marquée « à vérifier ».
  </p>
</section>

<section class="carte">
  <h2>Questions fréquentes</h2>
  <dl>
    <dt>Le nombre d'équipes est impair.</dt>
    <dd>
      À chaque partie, une équipe est exempte (la moins bien classée qui ne l'a pas encore été) et reçoit par défaut 972 points,
      la moitié d'une partie. Si une équipe finit sa table tôt, « Faire jouer l'exempte » : elles jouent ensemble,
      l'exempte garde son vrai score à la place des 972 points, et le score de l'autre équipe n'est pas pris en compte.
    </dd>
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
