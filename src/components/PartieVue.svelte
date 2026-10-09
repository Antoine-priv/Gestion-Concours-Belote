<script lang="ts">
  import { pointsExempt } from '../lib/classement';
  import { aller, imprimer } from '../lib/navigation.svelte';
  import { MOITIE_PARTIE, NB_PARTIES } from '../lib/reglages';
  import { issue } from '../lib/score';
  import {
    annulerDernierePartie,
    annulerRattrapage,
    echangerPlaces,
    enregistrerRattrapage,
    enregistrerResultat,
    lancerRattrapage,
    lancerTirage,
    nbPartiesPrevues,
    nomParticipant,
    numeroParticipant,
    partieComplete,
  } from '../lib/store.svelte';
  import type { Concours, Id, Table } from '../lib/types';
  import SaisieScore from './SaisieScore.svelte';

  let { concours: c, numero }: { concours: Concours; numero: number } = $props();

  const partie = $derived(c.parties.find((p) => p.numero === numero)!);
  const derniere = $derived(numero === c.parties.length);
  const modifiable = $derived(derniere && !c.termine);
  const saisies = $derived(partie.tables.filter((t) => t.resultat).length);
  const reste = $derived(partie.tables.length - saisies);
  const complete = $derived(partieComplete(c, numero));
  const resultatsApres = $derived(c.parties.some((p) => p.numero > numero));

  let tableOuverte = $state<number | null>(null);
  let rattrapageOuvert = $state(false);
  let allerA = $state<number | null>(null);
  let modeEchange = $state(false);
  let selection = $state<{ table: number; cote: 'a' | 'b' } | null>(null);
  let filtre = $state<'toutes' | 'attente' | 'saisies'>('toutes');
  let choixAdversaire = $state(false);
  let adversaire = $state<Id | ''>('');

  // Le filtre n'est proposé que s'il y a à la fois des tables saisies et en attente.
  const filtreActif = $derived(saisies > 0 && reste > 0 ? filtre : 'toutes');
  const tablesAffichees = $derived(
    partie.tables.filter((t) => filtreActif === 'toutes' || (filtreActif === 'attente' ? !t.resultat : !!t.resultat)),
  );
  const ouverte = $derived(partie.tables.find((t) => t.numero === tableOuverte));

  /** Adversaires possibles de l'exempt : d'abord les équipes dont la table est terminée. */
  const candidats = $derived(
    partie.tables
      .flatMap((t) => [t.a, t.b].map((id) => ({ id, fini: !!t.resultat, table: t.numero })))
      .sort((x, y) => Number(y.fini) - Number(x.fini) || numeroParticipant(c, x.id) - numeroParticipant(c, y.id)),
  );

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

  function demarrerRattrapage() {
    if (!adversaire) return;
    lancerRattrapage(c, numero, adversaire);
    choixAdversaire = false;
    adversaire = '';
    rattrapageOuvert = true;
  }

  function supprimerRattrapage() {
    const msg = partie.rattrapage?.resultat
      ? `Annuler le rattrapage ? Son score sera effacé et l'exempte recevra de nouveau ${texteExempt}.`
      : 'Annuler le rattrapage ?';
    if (confirm(msg)) annulerRattrapage(c, numero);
  }

  const texteExempt = $derived(
    c.reglages.exemptPoints === 'moitie'
      ? `${MOITIE_PARTIE} points (la moitié d'une partie)`
      : `la moyenne des points de toutes les équipes de cette partie (${pointsExempt(c, partie)} points)`,
  );

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

  function terminer(avance: boolean) {
    if (avance && !confirm(`Terminer le concours maintenant, après ${numero} partie(s) sur ${NB_PARTIES} ?`)) return;
    c.termine = true;
    aller(`/concours/${c.id}/classement`);
  }
</script>

<div class="ligne entete">
  <h2>Partie {numero} <span class="discret">/ {nbPartiesPrevues(c)}</span></h2>
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

{#if partie.exempt}
  {@const rat = partie.rattrapage}
  <div class="alerte info exempt">
    <div>
      <strong>Exempte :</strong> n° {numeroParticipant(c, partie.exempt)} {nomParticipant(partie.exempt)}
      {#if !rat}
        <span class="discret">— ne joue pas cette partie et reçoit {texteExempt}.</span>
      {/if}
    </div>

    {#if rat}
      <div class="ligne rattrapage">
        <span>
          <strong>Rattrapage</strong> contre n° {numeroParticipant(c, rat.adversaire)} {nomParticipant(rat.adversaire)}
          <span class="discret">(pour du beurre : seul le score de l'exempte compte)</span>
        </span>
        <span class="espace"></span>
        {#if rat.resultat}
          <strong class="score">{rat.resultat.a.points} – {rat.resultat.b.points}</strong>
        {:else}
          <span class="pastille attente">en attente</span>
        {/if}
        {#if modifiable}
          <button class:principal={!rat.resultat} onclick={() => (rattrapageOuvert = true)}>
            {rat.resultat ? 'Modifier' : 'Saisir les points'}
          </button>
          <button class="petit danger" onclick={supprimerRattrapage}>Annuler le rattrapage</button>
        {/if}
      </div>
    {:else if modifiable}
      {#if choixAdversaire}
        <div class="ligne rattrapage">
          <label>
            Joue contre
            <select bind:value={adversaire}>
              <option value="">Choisir une équipe…</option>
              {#each candidats as x (x.id)}
                <option value={x.id}>
                  n° {numeroParticipant(c, x.id)} {nomParticipant(x.id)} — {x.fini ? 'a fini' : `table ${x.table} en cours`}
                </option>
              {/each}
            </select>
          </label>
          <button class="principal" disabled={!adversaire} onclick={demarrerRattrapage}>Valider</button>
          <button onclick={() => (choixAdversaire = false)}>Annuler</button>
        </div>
      {:else}
        <div class="ligne rattrapage">
          <span class="discret">Une équipe a fini tôt ? Elle peut jouer contre l'exempte, qui gardera alors son vrai score.</span>
          <button onclick={() => (choixAdversaire = true)}>Faire jouer l'exempte</button>
        </div>
      {/if}
    {/if}
  </div>
{/if}

<div class="ligne outils">
  <form class="ligne" onsubmit={ouvrirNumero}>
    <label>Saisir la table n° <input type="number" min="1" bind:value={allerA} /></label>
    <button type="submit" disabled={allerA == null}>OK</button>
  </form>
  {#if reste > 0}
    <button class="principal" onclick={() => { tableOuverte = null; suivante(); }}>
      Saisir les points ({reste} restante{reste > 1 ? 's' : ''})
    </button>
  {/if}
  <span class="espace"></span>
  {#if saisies > 0 && reste > 0}
    <select bind:value={filtre} aria-label="Filtrer les tables">
      <option value="toutes">Toutes les tables</option>
      <option value="attente">En attente</option>
      <option value="saisies">Saisies</option>
    </select>
  {/if}
  {#if modifiable && partie.tables.length > 1}
    <button class:principal={modeEchange} onclick={() => { modeEchange = !modeEchange; selection = null; }}>
      {modeEchange ? 'Terminer les échanges' : 'Modifier le tirage'}
    </button>
  {/if}
</div>

{#if modeEchange}
  <div class="alerte attention">Cliquez sur une équipe, puis sur une autre pour les échanger de place.</div>
{/if}

<div class="defile">
  <table class="liste">
    <thead>
      <tr>
        <th class="nb">Table</th>
        <th>Équipe</th>
        <th class="nb">Points</th>
        <th class="sep"></th>
        <th class="nb">Points</th>
        <th>Équipe</th>
        <th>Détail</th>
      </tr>
    </thead>
    <tbody>
      {#each tablesAffichees as t (t.numero)}
        {@const res = t.resultat}
        {@const g = res ? issue(res) : null}
        <tr class:cliquable={!modeEchange} onclick={() => cliquerLigne(t)}>
          <td class="nb"><strong class="numtable">{t.numero}</strong></td>
          {@render camp(t, 'a', g)}
          <td class="nb score" class:gagne={g === 'a'}>{res?.a.points ?? ''}</td>
          <td class="sep">{res ? '–' : 'contre'}</td>
          <td class="nb score" class:gagne={g === 'b'}>{res?.b.points ?? ''}</td>
          {@render camp(t, 'b', g)}
          <td>
            {#if res}
              <span class="detail">
                {#if res.a.belotes + res.b.belotes}B {res.a.belotes}–{res.b.belotes}{/if}
                {#if res.a.capots + res.b.capots}· C {res.a.capots}–{res.b.capots}{/if}
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

{#snippet camp(t: Table, cote: 'a' | 'b', g: string | null)}
  <td
    class="camp"
    class:gagne={g === cote}
    class:echangeable={modeEchange}
    class:choisi={selection?.table === t.numero && selection?.cote === cote}
    onclick={(e) => cliquerCamp(e, t, cote)}>
    <span class="discret">n° {numeroParticipant(c, t[cote])}</span> {nomParticipant(t[cote])}
  </td>
{/snippet}

{#if derniere && complete && !c.termine}
  <section class="carte suite">
    {#if numero < NB_PARTIES}
      <h3>Tous les résultats de la partie {numero} sont saisis.</h3>
      <p class="discret">Les tables de la partie suivante seront formées selon le classement.</p>
      <div class="ligne">
        <a class="bouton" href="#/concours/{c.id}/classement">Voir le classement</a>
        <button class="principal" onclick={tirerSuivante}>Tirage de la partie {numero + 1}</button>
        <span class="espace"></span>
        <button onclick={() => terminer(true)} title="En cas d'imprévu">Terminer le concours maintenant</button>
      </div>
    {:else}
      <h3>C'était la dernière partie !</h3>
      <div class="ligne">
        <button onclick={tirerSuivante} title="En cas d'imprévu">Ajouter une partie</button>
        <button class="principal" onclick={() => terminer(false)}>Terminer et voir le classement final</button>
      </div>
    {/if}
  </section>
{/if}

{#if modifiable}
  <p class="ligne fin">
    <button class="danger petit" onclick={annuler}>Annuler le tirage de cette partie</button>
  </p>
{/if}

{#if ouverte}
  {#key ouverte.numero}
    <SaisieScore
      concours={c}
      titre="Table {ouverte.numero} — Partie {numero}"
      a={ouverte.a}
      b={ouverte.b}
      initial={ouverte.resultat}
      onenregistrer={(r) => enregistrerResultat(c, numero, ouverte.numero, r)}
      onfermer={() => (tableOuverte = null)}
      onsuivante={suivante} />
  {/key}
{/if}

{#if rattrapageOuvert && partie.exempt && partie.rattrapage}
  <SaisieScore
    concours={c}
    titre="Rattrapage de l'exempte — Partie {numero}"
    a={partie.exempt}
    b={partie.rattrapage.adversaire}
    initial={partie.rattrapage.resultat}
    noteB="Joue pour du beurre : ses points ne comptent pas"
    onenregistrer={(r) => enregistrerRattrapage(c, numero, r)}
    onfermer={() => (rattrapageOuvert = false)} />
{/if}

<style>
  .entete {
    margin-bottom: 1rem;
  }
  .entete h2 {
    margin: 0;
  }
  .exempt {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .rattrapage .score {
    font-size: 1.1rem;
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
