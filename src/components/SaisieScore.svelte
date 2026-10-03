<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { issue, verifier } from '../lib/score';
  import { enregistrerResultat, nomCamp, numeroParticipant } from '../lib/store.svelte';
  import type { Concours, Resultat, Table } from '../lib/types';

  let {
    concours: c,
    partie,
    table,
    onfermer,
    onsuivante,
  }: {
    concours: Concours;
    partie: number;
    table: Table;
    onfermer: () => void;
    onsuivante: () => void;
  } = $props();

  const r = $derived(c.reglages);
  // Valeurs initiales du formulaire (le composant est recréé pour chaque table).
  const ex = untrack(() => table.resultat);
  // Les champs vides valent 0 (sauf les points, obligatoires).
  let pa = $state<number | null>(ex?.a.points ?? null);
  let pb = $state<number | null>(ex?.b.points ?? null);
  let ba = $state<number | null>(ex?.a.belotes || null);
  let bb = $state<number | null>(ex?.b.belotes || null);
  let ca = $state<number | null>(ex?.a.capots || null);
  let cb = $state<number | null>(ex?.b.capots || null);
  let aa = $state<number | null>(ex?.a.annonces || null);
  let ab = $state<number | null>(ex?.b.annonces || null);
  let donnes = $state<number | null>(ex?.donnes ?? null);

  let dialogue: HTMLDialogElement;
  let premier: HTMLInputElement;

  const v = (x: number | null) => (x == null || Number.isNaN(x) ? 0 : x);
  const resultat = $derived<Resultat>({
    a: { points: v(pa), belotes: v(ba), capots: v(ca), annonces: r.annonces ? v(aa) : 0 },
    b: { points: v(pb), belotes: v(bb), capots: v(cb), annonces: r.annonces ? v(ab) : 0 },
    ...(donnes ? { donnes } : {}),
  });
  const complet = $derived(pa != null && pb != null);
  const verif = $derived(verifier(resultat, r));
  const gagnant = $derived(complet ? issue(resultat) : null);

  const nomA = $derived(nomCamp(c, table.a));
  const nomB = $derived(nomCamp(c, table.b));
  const numA = $derived(table.a.map((id) => numeroParticipant(c, id)).join('+'));
  const numB = $derived(table.b.map((id) => numeroParticipant(c, id)).join('+'));

  onMount(() => {
    dialogue.showModal();
    premier.focus();
    premier.select();
  });

  function enregistrer(force: boolean, suivante: boolean) {
    if (!complet) return;
    if (!verif.ok && !force) return;
    const res: Resultat = $state.snapshot(resultat);
    if (verif.donnesDeduites && !res.donnes) res.donnes = verif.donnesDeduites;
    if (force && !verif.ok) res.force = true;
    enregistrerResultat(c, partie, table.numero, res);
    if (suivante) onsuivante();
    else onfermer();
  }

  function soumettre(e: SubmitEvent) {
    e.preventDefault();
    enregistrer(false, true);
  }

  function forcer() {
    if (confirm(`Les points ne concordent pas :\n${verif.message}\n\nEnregistrer quand même ?`)) enregistrer(true, true);
  }

  function effacer() {
    if (!confirm('Effacer le résultat de cette table ?')) return;
    enregistrerResultat(c, partie, table.numero, undefined);
    onfermer();
  }
</script>

<dialog bind:this={dialogue} onclose={onfermer}>
  <form onsubmit={soumettre}>
    <div class="ligne titre">
      <h2>Table {table.numero} — Partie {partie}</h2>
      <span class="espace"></span>
      <button type="button" class="lien" onclick={() => dialogue.close()} aria-label="Fermer">✕</button>
    </div>

    <div class="grille">
      <span></span>
      <div class="camp" class:gagne={gagnant === 'a'}>
        <span class="num">{c.reglages.mode === 'melee' ? 'Joueurs' : 'Équipe'} {numA}</span>
        <strong>{nomA}</strong>
      </div>
      <div class="camp" class:gagne={gagnant === 'b'}>
        <span class="num">{c.reglages.mode === 'melee' ? 'Joueurs' : 'Équipe'} {numB}</span>
        <strong>{nomB}</strong>
      </div>

      <label for="pa" class="libelle">Points</label>
      <input id="pa" class="points" type="number" min="0" inputmode="numeric" bind:value={pa} bind:this={premier} required />
      <input class="points" type="number" min="0" inputmode="numeric" bind:value={pb} required aria-label="Points équipe B" />

      <label for="ba" class="libelle">Belotes</label>
      <input id="ba" type="number" min="0" inputmode="numeric" bind:value={ba} placeholder="0" />
      <input type="number" min="0" inputmode="numeric" bind:value={bb} placeholder="0" aria-label="Belotes équipe B" />

      <label for="ca" class="libelle">Capots</label>
      <input id="ca" type="number" min="0" inputmode="numeric" bind:value={ca} placeholder="0" />
      <input type="number" min="0" inputmode="numeric" bind:value={cb} placeholder="0" aria-label="Capots équipe B" />

      {#if r.annonces}
        <label for="aa" class="libelle">Annonces <small>(points)</small></label>
        <input id="aa" type="number" min="0" step="10" inputmode="numeric" bind:value={aa} placeholder="0" />
        <input type="number" min="0" step="10" inputmode="numeric" bind:value={ab} placeholder="0" aria-label="Annonces équipe B" />
      {/if}
    </div>

    {#if r.finPartie !== 'donnes' || donnes}
      <label class="donnes">
        Donnes jouées
        <input type="number" min="1" inputmode="numeric" bind:value={donnes} placeholder={r.controle === 'complet' ? 'auto' : ''} />
        {#if r.controle === 'complet' && !donnes}<small class="discret">Laisser vide : calculé à partir des points.</small>{/if}
      </label>
    {:else}
      <p class="discret donnes">
        {r.nbDonnes} donnes.
        <button type="button" class="lien" onclick={() => (donnes = r.nbDonnes)}>Partie écourtée ?</button>
      </p>
    {/if}

    {#if complet}
      <div class="alerte {verif.ok ? 'info' : 'erreur'}">
        <strong>Total : {verif.total}</strong>
        {#if verif.message} — {verif.message}{/if}
        {#if verif.ok}
          <br />{gagnant === 'nul' ? 'Match nul.' : `Gagnant : ${gagnant === 'a' ? nomA : nomB}.`}
        {/if}
      </div>
    {/if}

    <div class="ligne actions">
      {#if ex}
        <button type="button" class="danger" onclick={effacer}>Effacer</button>
      {/if}
      <span class="espace"></span>
      {#if complet && !verif.ok}
        <button type="button" onclick={forcer}>Enregistrer quand même</button>
      {/if}
      <button type="button" disabled={!complet || !verif.ok} onclick={() => enregistrer(false, false)}>Enregistrer</button>
      <button type="submit" class="principal" disabled={!complet || !verif.ok}>Enregistrer et table suivante ⏎</button>
    </div>
  </form>
</dialog>

<style>
  dialog {
    border: none;
    border-radius: 12px;
    padding: 1.4rem 1.6rem;
    width: min(680px, 95vw);
    box-shadow: 0 10px 40px rgb(0 0 0 / 0.25);
  }
  dialog::backdrop {
    background: rgb(20 30 25 / 0.45);
  }
  .titre h2 {
    margin: 0;
  }
  .grille {
    display: grid;
    grid-template-columns: auto 1fr 1fr;
    gap: 0.55rem 1rem;
    align-items: center;
    margin: 1rem 0;
  }
  .camp {
    display: flex;
    flex-direction: column;
    padding: 0.5rem 0.7rem;
    border-radius: var(--rayon);
    background: var(--surface-2);
    border: 1px solid var(--bord);
    min-height: 4.2em;
  }
  .camp.gagne {
    background: var(--accent-clair);
    border-color: var(--accent);
  }
  .num {
    font-size: 0.82rem;
    color: var(--texte-2);
  }
  .libelle {
    font-weight: 600;
  }
  .grille input {
    width: 100%;
  }
  input.points {
    font-size: 1.35rem;
    font-weight: 700;
    padding: 0.3em 0.5em;
  }
  .donnes {
    margin-bottom: 0.9rem;
  }
  .donnes input {
    width: 6em;
  }
  .actions {
    margin-top: 0.5rem;
  }
</style>
