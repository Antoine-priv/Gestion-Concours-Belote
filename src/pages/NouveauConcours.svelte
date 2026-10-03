<script lang="ts">
  import ReglagesForm from '../components/ReglagesForm.svelte';
  import { aujourdhui } from '../lib/format';
  import { aller } from '../lib/navigation.svelte';
  import { reglagesParDefaut } from '../lib/reglages';
  import { app, creerConcours, dupliquerReglages } from '../lib/store.svelte';

  let nom = $state('Concours de belote');
  let date = $state(aujourdhui());
  let lieu = $state('');
  let reglages = $state(dupliquerReglages());
  const aUnPrecedent = app.donnees.concours.length > 0;
  const parDefaut = JSON.stringify(reglagesParDefaut());
  const dejaParDefaut = $derived(JSON.stringify(reglages) === parDefaut);

  function creer(e: SubmitEvent) {
    e.preventDefault();
    const id = creerConcours(nom.trim() || 'Concours de belote', date, lieu.trim(), $state.snapshot(reglages));
    aller(`/concours/${id}`);
  }
</script>

<form onsubmit={creer}>
  <h1>Nouveau concours</h1>

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
  </section>

  <div class="ligne reglages-entete">
    <h2>Règles</h2>
    <span class="discret">
      {aUnPrecedent ? 'Reprises du dernier concours.' : 'Réglages par défaut : 4 parties de 12 donnes, capot à 252.'}
      Tout reste modifiable plus tard.
    </span>
    <span class="espace"></span>
    <button type="button" disabled={dejaParDefaut} onclick={() => (reglages = reglagesParDefaut())}>Revenir aux réglages par défaut</button>
  </div>

  {#key reglages}
    <ReglagesForm bind:reglages />
  {/key}

  <div class="ligne fin">
    <a class="bouton" href="#/">Annuler</a>
    <button class="principal" type="submit">Créer le concours</button>
  </div>
</form>

<style>
  .reglages-entete {
    margin: 1.5rem 0 0.75rem;
  }
  .reglages-entete h2 {
    margin: 0;
  }
</style>
