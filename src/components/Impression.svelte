<script lang="ts">
  import { calculerClassement } from '../lib/classement';
  import { dateFr, rangTexte } from '../lib/format';
  import type { VueImpression } from '../lib/navigation.svelte';
  import { concours, equipe, nomCamp, nomParticipant, nomsEquipe, numeroParticipant } from '../lib/store.svelte';
  import type { Id } from '../lib/types';

  let { vue }: { vue: VueImpression } = $props();

  const c = $derived(concours(vue.concours)!);
  const melee = $derived(c.reglages.mode === 'melee');
  const partie = $derived('partie' in vue ? c.parties.find((p) => p.numero === vue.partie) : undefined);
  const nbLignes = $derived(c.reglages.finPartie === 'donnes' ? c.reglages.nbDonnes : 16);

  const nums = (ids: Id[]) => ids.map((id) => numeroParticipant(c, id)).join(' + ');

  /** Pour l'affichage mural : retrouver sa table à partir de son numéro. */
  const parNumero = $derived(
    partie
      ? partie.tables
          .flatMap((t) => [...t.a, ...t.b].map((id) => ({ id, table: t.numero })))
          .concat(partie.exempts.map((id) => ({ id, table: 0 })))
          .sort((x, y) => numeroParticipant(c, x.id) - numeroParticipant(c, y.id))
      : [],
  );
</script>

<div class="impression">
  <header>
    <strong>{c.nom}</strong>
    <span>{dateFr(c.date)}{c.lieu ? ` — ${c.lieu}` : ''}</span>
  </header>

  {#if vue.type === 'inscrits'}
    <h1>{melee ? 'Joueurs inscrits' : 'Équipes inscrites'} ({c.participants.length})</h1>
    <table>
      <thead><tr><th class="nb">N°</th><th>{melee ? 'Joueur' : 'Équipe'}</th></tr></thead>
      <tbody>
        {#each [...c.participants].sort((a, b) => a.numero - b.numero) as p (p.id)}
          {@const e = melee ? undefined : equipe(p.id)}
          <tr>
            <td class="nb">{p.numero}</td>
            <td>{nomParticipant(c, p.id)}{#if e?.nom}<span class="petit"> — {nomsEquipe(e)}</span>{/if}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else if vue.type === 'tirage' && partie}
    <h1>Partie {partie.numero} — tirage des tables</h1>
    <table class="gros">
      <thead><tr><th class="nb">Table</th><th>{melee ? 'Joueurs' : 'Équipe'}</th><th></th><th>{melee ? 'Joueurs' : 'Équipe'}</th></tr></thead>
      <tbody>
        {#each partie.tables as t (t.numero)}
          <tr>
            <td class="nb"><strong>{t.numero}</strong></td>
            <td><span class="petit">n° {nums(t.a)}</span> {nomCamp(c, t.a)}</td>
            <td class="centre">contre</td>
            <td><span class="petit">n° {nums(t.b)}</span> {nomCamp(c, t.b)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    {#if partie.exempts.length}
      <p><strong>Exempt{partie.exempts.length > 1 ? 's' : ''} :</strong> {partie.exempts.map((id) => `n° ${numeroParticipant(c, id)} ${nomParticipant(c, id)}`).join(', ')}</p>
    {/if}

    <h2 class="saut">Partie {partie.numero} — où suis-je ?</h2>
    <div class="colonnes">
      {#each parNumero as x (x.id)}
        <div class="ou"><strong>n° {numeroParticipant(c, x.id)}</strong> {nomParticipant(c, x.id)} → <strong>{x.table ? `table ${x.table}` : 'exempt'}</strong></div>
      {/each}
    </div>
  {:else if vue.type === 'feuilles' && partie}
    {#each partie.tables as t (t.numero)}
      <section class="feuille" class:deux={nbLignes <= 13}>
        <div class="feuille-entete">
          <span class="table-num">Table {t.numero}</span>
          <span>{c.nom} — Partie {partie.numero} / {c.reglages.nbParties}</span>
          <span class="petit">
            {c.reglages.finPartie === 'donnes'
              ? `${c.reglages.nbDonnes} donnes`
              : c.reglages.finPartie === 'temps'
                ? `${c.reglages.dureeMinutes} minutes`
                : `en ${c.reglages.scoreCible} points`}
          </span>
        </div>
        <table class="grille">
          <thead>
            <tr>
              <th class="donne">Donne</th>
              <th><span class="petit">n° {nums(t.a)}</span><br />{nomCamp(c, t.a)}</th>
              <th><span class="petit">n° {nums(t.b)}</span><br />{nomCamp(c, t.b)}</th>
            </tr>
          </thead>
          <tbody>
            {#each Array.from({ length: nbLignes }, (_, i) => i + 1) as d (d)}
              <tr><td class="donne">{d}</td><td></td><td></td></tr>
            {/each}
            <tr class="bilan"><td>Belotes</td><td></td><td></td></tr>
            <tr class="bilan"><td>Capots</td><td></td><td></td></tr>
            {#if c.reglages.annonces}<tr class="bilan"><td>Annonces</td><td></td><td></td></tr>{/if}
            <tr class="total"><td>TOTAL</td><td></td><td></td></tr>
          </tbody>
        </table>
      </section>
    {/each}
  {:else if vue.type === 'classement'}
    {@const lignes = calculerClassement(c, vue.jusqua)}
    {@const lots = c.reglages.lots.some(Boolean)}
    <h1>
      {c.termine && (vue.jusqua ?? c.parties.length) === c.parties.length ? 'Classement final' : `Classement après la partie ${vue.jusqua ?? c.parties.length}`}
    </h1>
    <table>
      <thead>
        <tr>
          <th class="nb">Rang</th><th class="nb">N°</th><th>{melee ? 'Joueur' : 'Équipe'}</th>
          <th class="nb">Gagnées</th><th class="nb">Points</th><th class="nb">Diff.</th>
          <th class="nb">Belotes</th><th class="nb">Capots</th>
          {#if lots}<th>Lot</th>{/if}
        </tr>
      </thead>
      <tbody>
        {#each lignes as l (l.id)}
          {@const e = melee ? undefined : equipe(l.id)}
          <tr>
            <td class="nb"><strong>{rangTexte(l.rang)}</strong></td>
            <td class="nb">{l.numero}</td>
            <td>{nomParticipant(c, l.id)}{#if e?.nom}<span class="petit"> — {nomsEquipe(e)}</span>{/if}</td>
            <td class="nb">{l.victoires}</td>
            <td class="nb"><strong>{l.points}</strong></td>
            <td class="nb">{l.difference}</td>
            <td class="nb">{l.belotes}</td>
            <td class="nb">{l.capots}</td>
            {#if lots}<td>{c.reglages.lots[l.rang - 1] ?? ''}</td>{/if}
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  @page {
    size: A4;
    margin: 12mm;
  }
  .impression {
    font-family: system-ui, 'Segoe UI', sans-serif;
    color: #000;
    font-size: 11pt;
  }
  header {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #000;
    padding-bottom: 2mm;
    margin-bottom: 4mm;
  }
  h1 {
    font-size: 18pt;
    margin: 0 0 4mm;
  }
  h2 {
    font-size: 15pt;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    border: 1px solid #555;
    padding: 1.5mm 2mm;
    text-align: left;
  }
  th {
    background: #eee;
  }
  .nb {
    text-align: right;
    width: 1%;
    white-space: nowrap;
  }
  .centre {
    text-align: center;
    width: 1%;
  }
  .petit {
    font-size: 0.85em;
    color: #444;
  }
  tr {
    break-inside: avoid;
  }
  table.gros {
    font-size: 14pt;
  }
  .saut {
    break-before: page;
  }
  .colonnes {
    columns: 2;
    column-gap: 8mm;
  }
  .ou {
    padding: 1mm 0;
    border-bottom: 1px dotted #999;
    break-inside: avoid;
  }
  .feuille {
    break-inside: avoid;
    break-after: page;
    padding-top: 3mm;
  }
  /* Deux feuilles par page A4 quand elles tiennent. */
  .feuille.deux {
    break-after: auto;
    height: 132mm;
    border-bottom: 1px dashed #999;
    margin-bottom: 4mm;
  }
  .feuille.deux:nth-of-type(2n) {
    break-after: page;
    border-bottom: none;
  }
  .feuille-entete {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 2mm;
  }
  .table-num {
    font-size: 18pt;
    font-weight: 700;
  }
  .grille {
    table-layout: fixed;
  }
  .grille td,
  .grille th {
    padding: 0.6mm 2mm;
    height: 5.6mm;
  }
  .grille .donne {
    width: 14mm;
    text-align: center;
  }
  .grille .bilan td:first-child,
  .grille .total td:first-child {
    font-weight: 600;
    text-align: center;
    font-size: 9pt;
  }
  .grille .total td {
    border-top: 2px solid #000;
    height: 8mm;
  }
</style>
