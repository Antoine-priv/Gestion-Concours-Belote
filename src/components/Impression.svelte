<script lang="ts">
  import { calculerClassement } from '../lib/classement';
  import { dateFr, rangTexte } from '../lib/format';
  import type { VueImpression } from '../lib/navigation.svelte';
  import { NB_DONNES } from '../lib/reglages';
  import { concours, equipe, nbPartiesPrevues, nomParticipant, nomsEquipe, numeroParticipant } from '../lib/store.svelte';
  import type { Id } from '../lib/types';

  let { vue }: { vue: VueImpression } = $props();

  const c = $derived(concours(vue.concours)!);
  const partie = $derived('partie' in vue ? c.parties.find((p) => p.numero === vue.partie) : undefined);
  const num = (id: Id) => numeroParticipant(c, id);

  /** Une feuille par table, plus une pour le rattrapage de l'exempte s'il a été lancé. */
  const feuilles = $derived(
    partie
      ? [
          ...partie.tables.map((t) => ({ titre: `Table ${t.numero}`, a: t.a, b: t.b, beurre: false })),
          ...(partie.exempt && partie.rattrapage
            ? [{ titre: 'Rattrapage', a: partie.exempt, b: partie.rattrapage.adversaire, beurre: true }]
            : []),
        ]
      : [],
  );

  /** Pour l'affichage mural : retrouver sa table à partir de son numéro. */
  const parNumero = $derived(
    partie
      ? partie.tables
          .flatMap((t) => [t.a, t.b].map((id) => ({ id, table: t.numero })))
          .concat(partie.exempt ? [{ id: partie.exempt, table: 0 }] : [])
          .sort((x, y) => num(x.id) - num(y.id))
      : [],
  );
</script>

<div class="impression">
  <header>
    <strong>{c.nom}</strong>
    <span>{dateFr(c.date)}{c.lieu ? ` — ${c.lieu}` : ''}</span>
  </header>

  {#if vue.type === 'inscrits'}
    <h1>Équipes inscrites ({c.participants.length})</h1>
    <table>
      <thead><tr><th class="nb">N°</th><th>Équipe</th></tr></thead>
      <tbody>
        {#each [...c.participants].sort((a, b) => a.numero - b.numero) as p (p.id)}
          {@const e = equipe(p.id)}
          <tr>
            <td class="nb">{p.numero}</td>
            <td>{nomParticipant(p.id)}{#if e?.nom}<span class="petit"> — {nomsEquipe(e)}</span>{/if}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else if vue.type === 'tirage' && partie}
    <h1>Partie {partie.numero} — tirage des tables</h1>
    <table class="gros">
      <thead><tr><th class="nb">Table</th><th>Équipe</th><th></th><th>Équipe</th></tr></thead>
      <tbody>
        {#each partie.tables as t (t.numero)}
          <tr>
            <td class="nb"><strong>{t.numero}</strong></td>
            <td><span class="petit">n° {num(t.a)}</span> {nomParticipant(t.a)}</td>
            <td class="centre">contre</td>
            <td><span class="petit">n° {num(t.b)}</span> {nomParticipant(t.b)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    {#if partie.exempt}
      <p><strong>Exempte :</strong> n° {num(partie.exempt)} {nomParticipant(partie.exempt)}</p>
    {/if}

    <h2 class="saut">Partie {partie.numero} — où suis-je ?</h2>
    <div class="colonnes">
      {#each parNumero as x (x.id)}
        <div class="ou"><strong>n° {num(x.id)}</strong> {nomParticipant(x.id)} → <strong>{x.table ? `table ${x.table}` : 'exempte'}</strong></div>
      {/each}
    </div>
  {:else if vue.type === 'feuilles' && partie}
    {#each feuilles as f (f.titre)}
      <section class="feuille">
        <div class="feuille-entete">
          <span class="table-num">{f.titre}</span>
          <span>{c.nom} — Partie {partie.numero} / {nbPartiesPrevues(c)}</span>
          <span class="petit">{NB_DONNES} donnes</span>
        </div>
        <table class="grille">
          <thead>
            <tr>
              <th class="donne">Donne</th>
              <th><span class="petit">n° {num(f.a)}</span><br />{nomParticipant(f.a)}</th>
              <th>
                <span class="petit">n° {num(f.b)}{f.beurre ? ' — pour du beurre' : ''}</span><br />{nomParticipant(f.b)}
              </th>
            </tr>
          </thead>
          <tbody>
            {#each Array.from({ length: NB_DONNES }, (_, i) => i + 1) as d (d)}
              <tr><td class="donne">{d}</td><td></td><td></td></tr>
            {/each}
            <tr class="bilan"><td>Belotes</td><td></td><td></td></tr>
            <tr class="bilan"><td>Capots</td><td></td><td></td></tr>
            <tr class="total"><td>TOTAL</td><td></td><td></td></tr>
          </tbody>
        </table>
      </section>
    {/each}
  {:else if vue.type === 'classement'}
    {@const lignes = calculerClassement(c, vue.jusqua)}
    <h1>
      {c.termine && (vue.jusqua ?? c.parties.length) === c.parties.length ? 'Classement final' : `Classement après la partie ${vue.jusqua ?? c.parties.length}`}
    </h1>
    <table>
      <thead>
        <tr>
          <th class="nb">Rang</th><th class="nb">N°</th><th>Équipe</th>
          <th class="nb">Points</th><th class="nb">Gagnées</th>
          <th class="nb">Belotes</th><th class="nb">Capots</th>
        </tr>
      </thead>
      <tbody>
        {#each lignes as l (l.id)}
          {@const e = equipe(l.id)}
          <tr>
            <td class="nb"><strong>{rangTexte(l.rang)}</strong></td>
            <td class="nb">{l.numero}</td>
            <td>{nomParticipant(l.id)}{#if e?.nom}<span class="petit"> — {nomsEquipe(e)}</span>{/if}</td>
            <td class="nb"><strong>{l.points}</strong></td>
            <td class="nb">{l.victoires}</td>
            <td class="nb">{l.belotes}</td>
            <td class="nb">{l.capots}</td>
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
  /* Deux feuilles de 12 donnes par page A4. */
  .feuille {
    break-inside: avoid;
    height: 132mm;
    padding-top: 3mm;
    border-bottom: 1px dashed #999;
    margin-bottom: 4mm;
  }
  .feuille:nth-of-type(2n) {
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
