<script lang="ts">
  import Classement from '../components/Classement.svelte';
  import Inscriptions from '../components/Inscriptions.svelte';
  import PartieVue from '../components/PartieVue.svelte';
  import ReglagesForm from '../components/ReglagesForm.svelte';
  import { dateFr } from '../lib/format';
  import { aller } from '../lib/navigation.svelte';
  import { concours, partieComplete, supprimerConcours } from '../lib/store.svelte';

  let { id, onglet }: { id: string; onglet: string } = $props();

  const c = $derived(concours(id));
  const ongletActif = $derived(
    onglet || (c && c.parties.length ? `partie-${c.parties.length}` : 'inscriptions'),
  );
  const numeroPartie = $derived(ongletActif.startsWith('partie-') ? Number(ongletActif.slice(7)) : 0);

  function ouvrirEcran() {
    window.open(`#/ecran/${id}`, `ecran-${id}`, 'popup,width=1280,height=800');
  }

  function supprimer() {
    if (!c) return;
    if (!confirm(`Supprimer définitivement le concours « ${c.nom} » et tous ses résultats ?`)) return;
    supprimerConcours(c.id);
    aller('/');
  }
</script>

{#if !c}
  <div class="alerte erreur">Ce concours n'existe pas (ou plus).</div>
  <a class="bouton" href="#/">Retour à la liste</a>
{:else}
  <div class="ligne entete">
    <div>
      <h1>{c.nom}</h1>
      <span class="discret">
        {dateFr(c.date)}{c.lieu ? ` — ${c.lieu}` : ''} ·
        {c.participants.length} {c.reglages.mode === 'melee' ? 'joueurs' : 'équipes'} ·
        {c.reglages.nbParties} parties
        {#if c.termine}<span class="pastille ok">Terminé</span>{/if}
      </span>
    </div>
    <span class="espace"></span>
    <button onclick={ouvrirEcran} title="Ouvre une fenêtre à placer sur le vidéoprojecteur ou la télé">
      Grand écran
    </button>
  </div>

  <nav class="onglets">
    <a href="#/concours/{id}/inscriptions" class:actif={ongletActif === 'inscriptions'}>
      Inscriptions <span class="compte">{c.participants.length}</span>
    </a>
    {#each c.parties as p (p.numero)}
      <a href="#/concours/{id}/partie-{p.numero}" class:actif={numeroPartie === p.numero}>
        Partie {p.numero}
        {#if partieComplete(c, p.numero)}<span class="coche" title="Tous les résultats sont saisis">✓</span>{/if}
      </a>
    {/each}
    <a href="#/concours/{id}/classement" class:actif={ongletActif === 'classement'}>
      {c.termine ? 'Classement final' : 'Classement'}
    </a>
    <a href="#/concours/{id}/reglages" class:actif={ongletActif === 'reglages'}>Réglages</a>
  </nav>

  {#if ongletActif === 'inscriptions'}
    <Inscriptions concours={c} />
  {:else if numeroPartie && c.parties.find((p) => p.numero === numeroPartie)}
    {#key numeroPartie}
      <PartieVue concours={c} numero={numeroPartie} />
    {/key}
  {:else if ongletActif === 'classement'}
    <Classement concours={c} />
  {:else if ongletActif === 'reglages'}
    {#if c.parties.length}
      <div class="alerte attention">
        Le concours a commencé : un changement de règles recalcule le classement, mais ne modifie pas les tirages
        déjà faits.
      </div>
    {/if}
    <section class="carte">
      <div class="grille-champs">
        <label class="champ"><span>Nom du concours</span><input bind:value={c.nom} /></label>
        <label class="champ"><span>Date</span><input type="date" bind:value={c.date} /></label>
        <label class="champ"><span>Lieu</span><input bind:value={c.lieu} /></label>
      </div>
    </section>
    <ReglagesForm bind:reglages={c.reglages} modeVerrouille={c.participants.length > 0} />
    <section class="carte">
      <h2>Supprimer le concours</h2>
      <p class="discret">Le concours, ses tirages et ses résultats seront effacés. Les joueurs restent enregistrés.</p>
      <button class="danger" onclick={supprimer}>Supprimer ce concours</button>
    </section>
  {:else}
    <div class="alerte erreur">Cette page n'existe pas.</div>
  {/if}
{/if}

<style>
  .entete {
    align-items: flex-start;
    margin-bottom: 1rem;
  }
  .entete h1 {
    margin: 0 0 0.2rem;
  }
  .onglets {
    display: flex;
    gap: 0.25rem;
    border-bottom: 2px solid var(--bord);
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }
  .onglets a {
    padding: 0.55em 1em;
    text-decoration: none;
    color: var(--texte-2);
    border-radius: 6px 6px 0 0;
    margin-bottom: -2px;
    border-bottom: 2px solid transparent;
    font-weight: 500;
  }
  .onglets a:hover {
    color: var(--texte);
    background: var(--surface);
  }
  .onglets a.actif {
    color: var(--accent);
    border-bottom-color: var(--accent);
    background: var(--surface);
    font-weight: 600;
  }
  .compte {
    font-size: 0.8em;
    background: var(--surface-2);
    border: 1px solid var(--bord);
    border-radius: 999px;
    padding: 0 0.5em;
    margin-left: 0.2em;
  }
  .coche {
    color: var(--accent);
    font-weight: 700;
  }
</style>
