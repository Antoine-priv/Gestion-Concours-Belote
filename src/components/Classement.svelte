<script lang="ts">
  import { untrack } from 'svelte';
  import { calculerClassement } from '../lib/classement';
  import { csv, dateFr, rangTexte } from '../lib/format';
  import { imprimer } from '../lib/navigation.svelte';
  import { LIBELLES_CRITERES } from '../lib/reglages';
  import { equipe, nomParticipant, nomsEquipe, partieComplete } from '../lib/store.svelte';
  import { telecharger } from '../lib/stockage';
  import type { Concours } from '../lib/types';

  let { concours: c }: { concours: Concours } = $props();

  let jusqua = $state<number>(untrack(() => c.parties.length));
  const lignes = $derived(calculerClassement(c, jusqua));
  const melee = $derived(c.reglages.mode === 'melee');
  const avecNuls = $derived(lignes.some((l) => l.nuls));
  const avecLots = $derived(c.reglages.lots.some(Boolean));
  const incomplet = $derived(c.parties.some((p) => p.numero <= jusqua && !partieComplete(c, p.numero)));
  const criteres = $derived(
    [c.reglages.classement === 'victoires' ? 'victoires' : 'points', ...c.reglages.departage]
      .filter((k, i, t) => t.indexOf(k) === i)
      .map((k) => LIBELLES_CRITERES[k as keyof typeof LIBELLES_CRITERES].toLowerCase()),
  );

  function joueurs(id: string) {
    const e = melee ? undefined : equipe(id);
    return e?.nom ? nomsEquipe(e) : '';
  }

  function exporter() {
    const entetes = ['Rang', 'N°', melee ? 'Joueur' : 'Équipe', ...(melee ? [] : ['Joueurs']), 'Gagnées', 'Nuls', 'Perdues', 'Points', 'Encaissés', 'Différence', 'Meilleure partie', 'Belotes', 'Capots', ...(avecLots ? ['Lot'] : [])];
    const lignesCsv = lignes.map((l) => [
      l.rang,
      l.numero,
      nomParticipant(c, l.id),
      ...(melee ? [] : [equipe(l.id) ? nomsEquipe(equipe(l.id)!) : '']),
      l.victoires,
      l.nuls,
      l.defaites,
      l.points,
      l.contre,
      l.difference,
      l.meilleure,
      l.belotes,
      l.capots,
      ...(avecLots ? [c.reglages.lots[l.rang - 1] ?? ''] : []),
    ]);
    telecharger(`classement-${c.nom}-${c.date}.csv`.replace(/[^\w.-]+/g, '_'), csv([entetes, ...lignesCsv]), 'text/csv');
  }
</script>

<div class="ligne entete">
  <h2>{c.termine ? 'Classement final' : 'Classement'}</h2>
  {#if c.parties.length > 1}
    <select bind:value={jusqua} aria-label="Classement après quelle partie">
      {#each c.parties as p (p.numero)}
        <option value={p.numero}>après la partie {p.numero}</option>
      {/each}
    </select>
  {/if}
  <span class="espace"></span>
  {#if c.parties.length}
    <button onclick={() => imprimer({ type: 'classement', concours: c.id, jusqua })}>Imprimer / PDF</button>
    <button onclick={exporter}>Exporter pour Excel</button>
  {/if}
</div>

{#if c.parties.length === 0}
  <p class="discret">Le classement apparaîtra après la saisie des premiers résultats.</p>
{:else}
  {#if incomplet}
    <div class="alerte attention">Certains résultats ne sont pas encore saisis : ce classement est provisoire.</div>
  {/if}
  <p class="discret">Classé par {criteres.join(', puis ')}.</p>

  <div class="defile">
    <table class="liste">
      <thead>
        <tr>
          <th class="nb">Rang</th>
          <th class="nb">N°</th>
          <th>{melee ? 'Joueur' : 'Équipe'}</th>
          <th class="nb" title="Parties gagnées">Gagnées</th>
          {#if avecNuls}<th class="nb">Nuls</th>{/if}
          <th class="nb">Points</th>
          <th class="nb" title="Points marqués moins points encaissés">Diff.</th>
          <th class="nb">Meilleure</th>
          <th class="nb">Belotes</th>
          <th class="nb">Capots</th>
          {#if avecLots}<th>Lot</th>{/if}
        </tr>
      </thead>
      <tbody>
        {#each lignes as l (l.id)}
          <tr class:podium={l.rang <= 3} class:abandon={l.abandon}>
            <td class="nb"><strong>{rangTexte(l.rang)}</strong></td>
            <td class="nb">{l.numero}</td>
            <td>
              {nomParticipant(c, l.id)}
              {#if joueurs(l.id)}<span class="discret"> — {joueurs(l.id)}</span>{/if}
              {#if l.abandon}<span class="pastille">abandon</span>{/if}
              {#if l.exempts}<span class="pastille" title="Nombre de parties où il était exempt">exempt ×{l.exempts}</span>{/if}
            </td>
            <td class="nb">{l.victoires}</td>
            {#if avecNuls}<td class="nb">{l.nuls}</td>{/if}
            <td class="nb"><strong>{l.points}</strong></td>
            <td class="nb">{l.difference > 0 ? '+' : ''}{l.difference}</td>
            <td class="nb">{l.meilleure}</td>
            <td class="nb">{l.belotes}</td>
            <td class="nb">{l.capots}</td>
            {#if avecLots}<td>{c.reglages.lots[l.rang - 1] ?? ''}</td>{/if}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="ligne fin pied">
    {#if c.termine}
      <span class="discret">Concours terminé le {dateFr(c.date)}.</span>
      <button onclick={() => (c.termine = false)}>Rouvrir le concours</button>
    {:else if c.parties.length >= c.reglages.nbParties && !incomplet}
      <button class="principal" onclick={() => (c.termine = true)}>Terminer le concours</button>
    {/if}
  </div>
{/if}

<style>
  .entete {
    margin-bottom: 0.75rem;
  }
  .entete h2 {
    margin: 0;
  }
  tr.podium td {
    background: #fbf7e8;
  }
  tr.abandon td {
    color: var(--texte-2);
  }
  .pied {
    margin-top: 1rem;
  }
</style>
