<script lang="ts">
  import { aujourdhui } from '../lib/format';
  import { aller } from '../lib/navigation.svelte';
  import { creerConcours } from '../lib/store.svelte';

  let nom = $state('Concours de belote');
  let date = $state(aujourdhui());
  let lieu = $state('');

  function creer(e: SubmitEvent) {
    e.preventDefault();
    const id = creerConcours(nom.trim() || 'Concours de belote', date, lieu.trim());
    aller(`/concours/${id}/inscriptions`);
  }
</script>

<form onsubmit={creer}>
  <div class="ligne entete">
    <h1>Nouveau concours</h1>
    <span class="espace"></span>
    <a class="bouton" href="#/">Annuler</a>
    <button class="principal" type="submit">Créer le concours</button>
  </div>

  <section class="carte">
    <div class="grille-champs">
      <label class="champ">
        <span>Nom du concours</span>
        <input bind:value={nom} required />
      </label>
      <label class="champ">
        <span>Date</span>
        <input type="date" bind:value={date} required />
      </label>
      <label class="champ">
        <span>Lieu <small>(facultatif)</small></span>
        <input bind:value={lieu} placeholder="Salle des fêtes" />
      </label>
    </div>
    <p class="discret note">
      4 parties de 12 donnes, classement aux points. Les autres réglages (départage, équipe exempte) sont dans
      l'onglet « Réglages » du concours.
    </p>
  </section>
</form>

<style>
  .entete {
    margin-bottom: 1rem;
  }
  .entete h1 {
    margin: 0;
  }
  .note {
    margin: 1rem 0 0;
  }
</style>
