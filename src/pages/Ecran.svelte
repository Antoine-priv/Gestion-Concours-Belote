<script lang="ts">
  import { onDestroy } from 'svelte';
  import Chrono from '../components/Chrono.svelte';
  import { calculerClassement } from '../lib/classement';
  import { rangTexte } from '../lib/format';
  import { lireLocal } from '../lib/stockage';
  import { concours, nomCamp, nomParticipant, numeroParticipant, remplacerDonnees } from '../lib/store.svelte';

  let { id }: { id: string } = $props();

  const c = $derived(concours(id));
  const partie = $derived(c?.parties.at(-1));
  let vue = $state<'tirage' | 'classement' | 'auto'>('auto');
  let alterne = $state<'tirage' | 'classement'>('tirage');
  const affichee = $derived(vue === 'auto' ? alterne : vue);
  const lignes = $derived(c ? calculerClassement(c) : []);

  // Secours si l'événement « storage » ne passe pas entre fenêtres.
  const relecture = setInterval(() => {
    const d = lireLocal();
    const nouveau = d.concours.find((x) => x.id === id);
    if (JSON.stringify(nouveau) !== JSON.stringify($state.snapshot(concours(id)))) remplacerDonnees(d);
  }, 3000);
  const rotation = setInterval(() => {
    if (vue === 'auto') alterne = alterne === 'tirage' ? 'classement' : 'tirage';
  }, 20000);
  onDestroy(() => {
    clearInterval(relecture);
    clearInterval(rotation);
  });

  // Plus il y a de lignes, plus on réduit la taille du texte et on ajoute des colonnes.
  const nbLignes = $derived(affichee === 'tirage' ? (partie?.tables.length ?? 0) : lignes.length);
  const colonnes = $derived(nbLignes > 40 ? 3 : nbLignes > 14 ? 2 : 1);
  const taille = $derived(Math.max(1, Math.min(2.2, 30 / Math.max(1, nbLignes / colonnes))));

  function pleinEcran() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }
</script>

<div class="ecran">
  {#if !c}
    <p class="vide">Concours introuvable.</p>
  {:else}
    <header>
      <div>
        <h1>{c.nom}</h1>
        {#if partie}
          <span class="sous">
            {affichee === 'tirage' ? `Partie ${partie.numero} / ${c.reglages.nbParties}` : c.termine ? 'Classement final' : `Classement après ${c.parties.length} partie${c.parties.length > 1 ? 's' : ''}`}
          </span>
        {/if}
      </div>
      {#if partie && !c.termine}
        <Chrono {partie} dureeMinutes={c.reglages.dureeMinutes} lectureSeule grand />
      {/if}
    </header>

    {#if !partie}
      <p class="vide">Inscriptions en cours… {c.participants.length} {c.reglages.mode === 'melee' ? 'joueurs' : 'équipes'}</p>
    {:else if affichee === 'tirage'}
      <div class="liste" style="columns: {colonnes}; font-size: {taille}rem">
        {#each partie.tables as t (t.numero)}
          <div class="elem tablee">
            <span class="table">T{t.numero}</span>
            <span>{nomCamp(c, t.a)} <small>({t.a.map((x) => numeroParticipant(c, x)).join('+')})</small></span>
            <span class="contre">–</span>
            <span>{nomCamp(c, t.b)} <small>({t.b.map((x) => numeroParticipant(c, x)).join('+')})</small></span>
            <span class="score">{t.resultat ? `${t.resultat.a.points} – ${t.resultat.b.points}` : ''}</span>
          </div>
        {/each}
        {#if partie.exempts.length}
          <div class="elem exempt">Exempt : {partie.exempts.map((x) => nomParticipant(c, x)).join(', ')}</div>
        {/if}
      </div>
    {:else}
      <div class="liste" style="columns: {colonnes}; font-size: {taille}rem">
        {#each lignes as l (l.id)}
          <div class="elem" class:podium={l.rang <= 3}>
            <span class="rang">{rangTexte(l.rang)}</span>
            <span class="nom">{nomParticipant(c, l.id)}</span>
            <span class="score">{l.victoires} V · {l.points} pts</span>
          </div>
        {/each}
      </div>
    {/if}
  {/if}

  <div class="commandes">
    {#if partie}
      <button class:actif={vue === 'tirage'} onclick={() => (vue = 'tirage')}>Tables</button>
      <button class:actif={vue === 'classement'} onclick={() => (vue = 'classement')}>Classement</button>
      <button class:actif={vue === 'auto'} onclick={() => (vue = 'auto')}>Alterner</button>
    {/if}
    <button onclick={pleinEcran}>Plein écran</button>
  </div>
</div>

<style>
  .ecran {
    min-height: 100vh;
    background: #103d2c;
    color: #fff;
    padding: 2vh 3vw;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
    border-bottom: 2px solid rgb(255 255 255 / 0.25);
    padding-bottom: 1vh;
    margin-bottom: 2vh;
  }
  h1 {
    font-size: clamp(1.6rem, 3.5vw, 3rem);
    margin: 0;
  }
  .sous {
    font-size: clamp(1.1rem, 2vw, 1.8rem);
    color: #bfe3d2;
  }
  header :global(.affichage) {
    color: #fff;
  }
  header :global(.affichage.fini) {
    color: #ffb4a9;
  }
  .liste {
    column-gap: 3vw;
  }
  .elem {
    display: flex;
    gap: 0.6em;
    align-items: baseline;
    padding: 0.25em 0.4em;
    border-bottom: 1px solid rgb(255 255 255 / 0.12);
    break-inside: avoid;
  }
  .elem.tablee {
    display: grid;
    grid-template-columns: 3.2ch 1fr auto 1fr auto;
  }
  .elem small {
    color: #9fcbb8;
    font-size: 0.7em;
  }
  .table,
  .rang {
    font-weight: 700;
    min-width: 3.2ch;
    color: #ffd98a;
  }
  .contre {
    color: #9fcbb8;
  }
  .nom {
    flex: 1;
  }
  .score {
    margin-left: auto;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .podium {
    background: rgb(255 217 138 / 0.12);
  }
  .exempt {
    color: #bfe3d2;
    font-style: italic;
  }
  .vide {
    font-size: 2rem;
    text-align: center;
    margin-top: 20vh;
  }
  .commandes {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    display: flex;
    gap: 0.4rem;
    opacity: 0.15;
    transition: opacity 0.2s;
  }
  .commandes:hover {
    opacity: 1;
  }
  .commandes button {
    background: rgb(255 255 255 / 0.12);
    color: #fff;
    border-color: rgb(255 255 255 / 0.3);
  }
  .commandes button.actif {
    background: rgb(255 255 255 / 0.3);
  }
</style>
