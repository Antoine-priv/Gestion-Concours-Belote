<script lang="ts">
  import { aller, imprimer } from '../lib/navigation.svelte';
  import { issue } from '../lib/score';
  import {
    annulerDernierePartie,
    echangerPlaces,
    lancerTirage,
    nomCamp,
    nomParticipant,
    numeroParticipant,
    partieComplete,
  } from '../lib/store.svelte';
  import type { Concours, Id, Table } from '../lib/types';
  import Chrono from './Chrono.svelte';
  import SaisieScore from './SaisieScore.svelte';

  let { concours: c, numero }: { concours: Concours; numero: number } = $props();

  const partie = $derived(c.parties.find((p) => p.numero === numero)!);
  const derniere = $derived(numero === c.parties.length);
  const saisies = $derived(partie.tables.filter((t) => t.resultat).length);
  const reste = $derived(partie.tables.length - saisies);
  const complete = $derived(partieComplete(c, numero));
  const melee = $derived(c.reglages.mode === 'melee');
  const resultatsApres = $derived(c.parties.some((p) => p.numero > numero));

  let tableOuverte = $state<number | null>(null);
  let allerA = $state<number | null>(null);
  let modeEchange = $state(false);
  let selection = $state<{ table: number; cote: 'a' | 'b' } | null>(null);
  let filtre = $state<'toutes' | 'attente' | 'saisies'>('toutes');

  const tablesAffichees = $derived(
    partie.tables.filter((t) => filtre === 'toutes' || (filtre === 'attente' ? !t.resultat : !!t.resultat)),
  );
  const ouverte = $derived(partie.tables.find((t) => t.numero === tableOuverte));

  function suivante() {
    const apres = partie.tables.find((t) => !t.resultat && t.numero > (tableOuverte ?? 0));
    const avant = partie.tables.find((t) => !t.resultat);
    tableOuverte = (apres ?? avant)?.numero ?? null;
  }

  function ouvrirNumero(e: SubmitEvent) {
    e.preventDefault();
    if (allerA == null) return;
    if (partie.tables.some((t) => t.numero === allerA)) tableOuverte = allerA;
    else alert(`Il n'y a pas de table n° ${allerA}.`);
    allerA = null;
  }

  function cliquerLigne(t: Table) {
    if (!modeEchange) tableOuverte = t.numero;
  }

  function cliquerCamp(e: MouseEvent, t: Table, cote: 'a' | 'b') {
    if (!modeEchange) return;
    e.stopPropagation();
    if (!selection) {
      selection = { table: t.numero, cote };
      return;
    }
    if (selection.table === t.numero && selection.cote === cote) {
      selection = null;
      return;
    }
    const touchees = partie.tables.filter((x) => (x.numero === t.numero || x.numero === selection!.table) && x.resultat);
    if (touchees.length && !confirm('Les résultats déjà saisis sur ces tables seront effacés. Continuer ?')) return;
    echangerPlaces(c, numero, selection, { table: t.numero, cote });
    selection = null;
  }

  function nomsAvecNumeros(ids: Id[]) {
    return ids.map((id) => ({ num: numeroParticipant(c, id), nom: nomParticipant(c, id) }));
  }

  function tirerSuivante() {
    const revanches = lancerTirage(c);
    if (revanches) alert(`Attention : ${revanches} revanche(s) n'ont pas pu être évitées.`);
    aller(`/concours/${c.id}/partie-${c.parties.length}`);
  }

  function annuler() {
    const msg = saisies
      ? `Annuler le tirage de la partie ${numero} ? Les ${saisies} résultat(s) déjà saisi(s) seront perdus.`
      : `Annuler le tirage de la partie ${numero} ?`;
    if (!confirm(msg)) return;
    annulerDernierePartie(c);
    aller(`/concours/${c.id}/${c.parties.length ? `partie-${c.parties.length}` : 'inscriptions'}`);
  }

  function terminer() {
    c.termine = true;
    aller(`/concours/${c.id}/classement`);
  }
</script>

<div class="ligne entete">
  <h2>Partie {numero} <span class="discret">/ {c.reglages.nbParties}</span></h2>
  <span class="pastille {complete ? 'ok' : 'attente'}">{saisies} / {partie.tables.length} tables saisies</span>
  <span class="espace"></span>
  <button onclick={() => imprimer({ type: 'tirage', concours: c.id, partie: numero })}>Imprimer le tirage</button>
  <button onclick={() => imprimer({ type: 'feuilles', concours: c.id, partie: numero })}>Imprimer les feuilles de table</button>
</div>

{#if resultatsApres}
  <div class="alerte attention">
    La partie suivante est déjà tirée : corriger un résultat ici met à jour le classement, mais pas le tirage suivant.
  </div>
{/if}

{#if derniere && !c.termine}
  <Chrono {partie} dureeMinutes={c.reglages.dureeMinutes} />
{/if}

{#if partie.exempts.length}
  {@const pl = partie.exempts.length > 1}
  <div class="alerte info">
    <strong>{partie.exempts.length > 1 ? 'Exempts' : 'Exempt'} :</strong>
    {partie.exempts.map((id) => `n° ${numeroParticipant(c, id)} ${nomParticipant(c, id)}`).join(', ')}
    <span class="discret">
      — {pl ? 'ne jouent' : 'ne joue'} pas cette partie{c.reglages.exemptVictoire ? (pl ? ', comptés gagnants' : ', compté gagnant') : ''},
      {pl ? 'reçoivent' : 'reçoit'}
      {c.reglages.exemptPoints === 'moyenne' ? 'la moyenne des points' : `${c.reglages.exemptPointsFixes} points`}.
    </span>
  </div>
{/if}

<div class="ligne outils">
  <form class="ligne" onsubmit={ouvrirNumero}>
    <label>Saisir la table n° <input type="number" min="1" bind:value={allerA} /></label>
    <button type="submit">OK</button>
  </form>
  {#if !complete}
    <button class="principal" onclick={() => { tableOuverte = null; suivante(); }}>
      Saisir les points ({reste} restante{reste > 1 ? 's' : ''})
    </button>
  {/if}
  <span class="espace"></span>
  <select bind:value={filtre} aria-label="Filtrer les tables">
    <option value="toutes">Toutes les tables</option>
    <option value="attente">En attente</option>
    <option value="saisies">Saisies</option>
  </select>
  {#if derniere && !c.termine}
    <button class:principal={modeEchange} onclick={() => { modeEchange = !modeEchange; selection = null; }}>
      {modeEchange ? 'Terminer les échanges' : 'Modifier le tirage'}
    </button>
  {/if}
</div>

{#if modeEchange}
  <div class="alerte attention">
    Cliquez sur {melee ? 'une paire de joueurs' : 'une équipe'}, puis sur une autre pour les échanger de place.
  </div>
{/if}

<div class="defile">
  <table class="liste">
    <thead>
      <tr>
        <th class="nb">Table</th>
        <th>{melee ? 'Joueurs' : 'Équipe'}</th>
        <th class="nb">Points</th>
        <th class="sep"></th>
        <th class="nb">Points</th>
        <th>{melee ? 'Joueurs' : 'Équipe'}</th>
        <th>Détail</th>
      </tr>
    </thead>
    <tbody>
      {#each tablesAffichees as t (t.numero)}
        {@const res = t.resultat}
        {@const g = res ? issue(res) : null}
        <tr class:cliquable={!modeEchange} onclick={() => cliquerLigne(t)}>
          <td class="nb"><strong class="numtable">{t.numero}</strong></td>
          {#each ['a', 'b'] as const as cote, i (cote)}
            {#if i === 1}
              <td class="sep">{res ? '–' : 'contre'}</td>
            {/if}
            {#if i === 1}
              <td class="nb score" class:gagne={g === 'b'}>{res?.b.points ?? ''}</td>
            {/if}
            <td
              class="camp"
              class:gagne={g === cote}
              class:echangeable={modeEchange}
              class:choisi={selection?.table === t.numero && selection?.cote === cote}
              onclick={(e) => cliquerCamp(e, t, cote)}>
              {#each nomsAvecNumeros(t[cote]) as p (p.num)}
                <div><span class="discret">n° {p.num}</span> {p.nom}</div>
              {/each}
            </td>
            {#if i === 0}
              <td class="nb score" class:gagne={g === 'a'}>{res?.a.points ?? ''}</td>
            {/if}
          {/each}
          <td>
            {#if res}
              <span class="detail">
                {#if res.a.belotes + res.b.belotes}B {res.a.belotes}–{res.b.belotes}{/if}
                {#if res.a.capots + res.b.capots}· C {res.a.capots}–{res.b.capots}{/if}
                {#if res.donnes && res.donnes !== c.reglages.nbDonnes}· {res.donnes} donnes{/if}
              </span>
              {#if res.force}<span class="pastille ko" title="Enregistré sans concordance">à vérifier</span>{/if}
            {:else}
              <span class="pastille attente">en attente</span>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if derniere && complete && !c.termine}
  <section class="carte suite">
    {#if numero < c.reglages.nbParties}
      <h3>Tous les résultats de la partie {numero} sont saisis.</h3>
      <p class="discret">
        {c.reglages.appariement === 'classement'
          ? 'Les tables de la partie suivante seront formées selon le classement.'
          : 'Les tables de la partie suivante seront tirées au sort.'}
      </p>
      <div class="ligne">
        <a class="bouton" href="#/concours/{c.id}/classement">Voir le classement</a>
        <button class="principal" onclick={tirerSuivante}>Tirage de la partie {numero + 1}</button>
      </div>
    {:else}
      <h3>C'était la dernière partie !</h3>
      <div class="ligne">
        <button onclick={tirerSuivante}>Jouer une partie de plus</button>
        <button class="principal" onclick={terminer}>Terminer et voir le classement final</button>
      </div>
    {/if}
  </section>
{/if}

{#if derniere && !c.termine}
  <p class="ligne fin">
    <button class="danger petit" onclick={annuler}>Annuler le tirage de cette partie</button>
  </p>
{/if}

{#if ouverte}
  {#key ouverte.numero}
    <SaisieScore
      concours={c}
      partie={numero}
      table={ouverte}
      onfermer={() => (tableOuverte = null)}
      onsuivante={suivante} />
  {/key}
{/if}

<style>
  .entete {
    margin-bottom: 1rem;
  }
  .entete h2 {
    margin: 0;
  }
  .outils {
    margin-bottom: 0.75rem;
  }
  .outils input {
    width: 5em;
  }
  .numtable {
    font-size: 1.15rem;
  }
  td.sep,
  th.sep {
    text-align: center;
    color: var(--texte-2);
    width: 3em;
  }
  td.score {
    font-size: 1.15rem;
    font-weight: 600;
    width: 5em;
  }
  td.gagne {
    color: var(--accent-fort);
    font-weight: 700;
  }
  td.camp.gagne {
    background: var(--accent-clair);
  }
  td.echangeable {
    cursor: pointer;
    outline: 1px dashed var(--bord);
  }
  td.echangeable:hover {
    background: var(--orange-clair);
  }
  td.choisi {
    background: var(--orange-clair);
    outline: 2px solid var(--orange);
  }
  .detail {
    font-size: 0.9rem;
    color: var(--texte-2);
  }
  .suite {
    margin-top: 1rem;
    border-color: var(--accent);
  }
  .fin {
    margin-top: 1.5rem;
  }
</style>
