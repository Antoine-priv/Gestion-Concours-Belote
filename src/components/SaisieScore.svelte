<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { confirmer } from '../lib/dialogue.svelte';
  import { NB_DONNES } from '../lib/reglages';
  import { issue, verifier } from '../lib/score';
  import { nomParticipant, numeroParticipant } from '../lib/store.svelte';
  import type { Concours, Id, Resultat } from '../lib/types';

  let {
    concours: c,
    titre,
    a,
    b,
    initial,
    noteB,
    onenregistrer,
    onfermer,
    onsuivante,
  }: {
    concours: Concours;
    titre: string;
    a: Id;
    b: Id;
    initial?: Resultat;
    /** Remarque affichée sous l'équipe B (ex. score non pris en compte). */
    noteB?: string;
    onenregistrer: (res: Resultat | undefined) => void;
    onfermer: () => void;
    /** Si fourni, « Enregistrer et table suivante » enchaîne sur la table suivante. */
    onsuivante?: () => void;
  } = $props();

  // Valeurs initiales du formulaire (le composant est recréé pour chaque table).
  const ex = untrack(() => initial);
  // Les champs vides valent 0 (sauf les points, obligatoires).
  let pa = $state<number | null>(ex?.a.points ?? null);
  let pb = $state<number | null>(ex?.b.points ?? null);
  let ba = $state<number | null>(ex?.a.belotes || null);
  let bb = $state<number | null>(ex?.b.belotes || null);
  let ca = $state<number | null>(ex?.a.capots || null);
  let cb = $state<number | null>(ex?.b.capots || null);

  let dialogue: HTMLDialogElement;
  let premier: HTMLInputElement;

  const v = (x: number | null) => (x == null || Number.isNaN(x) ? 0 : x);
  const resultat = $derived<Resultat>({
    a: { points: v(pa), belotes: v(ba), capots: v(ca) },
    b: { points: v(pb), belotes: v(bb), capots: v(cb) },
  });
  const complet = $derived(pa != null && pb != null);
  const verif = $derived(verifier(resultat));
  const gagnant = $derived(complet ? issue(resultat) : null);
  const nomA = $derived(nomParticipant(a));
  const nomB = $derived(nomParticipant(b));

  onMount(() => {
    dialogue.showModal();
    premier.focus();
    premier.select();
  });

  function enregistrer(force: boolean, suivante: boolean) {
    if (!complet) return;
    if (!verif.ok && !force) return;
    const res: Resultat = $state.snapshot(resultat);
    if (force && !verif.ok) res.force = true;
    onenregistrer(res);
    if (suivante && onsuivante) onsuivante();
    else onfermer();
  }

  function soumettre(e: SubmitEvent) {
    e.preventDefault();
    enregistrer(false, true);
  }

  async function forcer() {
    const ok = await confirmer('Enregistrer malgré l’écart ?', {
      message: `${verif.message}\nLa table sera marquée « à vérifier ».`,
      valider: 'Enregistrer quand même',
    });
    if (ok) enregistrer(true, true);
  }

  async function effacer() {
    if (!(await confirmer('Effacer ce résultat ?', { valider: 'Effacer', danger: true }))) return;
    onenregistrer(undefined);
    onfermer();
  }
</script>

<dialog bind:this={dialogue} onclose={onfermer}>
  <form onsubmit={soumettre}>
    <div class="ligne titre">
      <h2>{titre}</h2>
      <span class="espace"></span>
      <button type="button" class="lien" onclick={() => dialogue.close()} aria-label="Fermer">✕</button>
    </div>

    <div class="grille">
      <span></span>
      <div class="camp" class:gagne={gagnant === 'a'}>
        <span class="num">Équipe {numeroParticipant(c, a)}</span>
        <strong>{nomA}</strong>
      </div>
      <div class="camp" class:gagne={gagnant === 'b'} class:note={!!noteB}>
        <span class="num">Équipe {numeroParticipant(c, b)}</span>
        <strong>{nomB}</strong>
        {#if noteB}<small>{noteB}</small>{/if}
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
    </div>

    <p class="discret">{NB_DONNES} donnes : le total doit faire {verif.attendu}.</p>

    {#if complet}
      <div class="alerte {verif.ok ? 'info' : 'erreur'}">
        <strong>Total : {verif.total}</strong> — {verif.message}
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
      {#if onsuivante}
        <button type="button" disabled={!complet || !verif.ok} onclick={() => enregistrer(false, false)}>Enregistrer</button>
        <button type="submit" class="principal" disabled={!complet || !verif.ok}>Enregistrer et table suivante ⏎</button>
      {:else}
        <button type="submit" class="principal" disabled={!complet || !verif.ok}>Enregistrer ⏎</button>
      {/if}
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
  .camp.note small {
    color: var(--orange);
    font-weight: 600;
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
  .actions {
    margin-top: 0.5rem;
  }
</style>
