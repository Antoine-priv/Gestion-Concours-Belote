<script lang="ts">
  import { dateFr } from '../lib/format';
  import { app, nomJoueur, nomParticipant } from '../lib/store.svelte';
  import { records, resumeConcours, statsJoueurs, type StatJoueur } from '../lib/stats';
  import type { Concours } from '../lib/types';

  let annee = $state('');
  let tri = $state<{ cle: keyof StatJoueur | 'pourcentage' | 'moyenne'; desc: boolean }>({ cle: 'victoires', desc: true });
  let recherche = $state('');

  const annees = $derived([...new Set(app.donnees.concours.map((c) => c.date.slice(0, 4)))].sort().reverse());
  const filtre = $derived((c: Concours) => !annee || c.date.startsWith(annee));
  const concoursFiltres = $derived(app.donnees.concours.filter(filtre));

  const valeur = (s: StatJoueur, cle: typeof tri.cle): number => {
    if (cle === 'pourcentage') return s.parties ? s.victoires / s.parties : 0;
    if (cle === 'moyenne') return s.parties ? s.points / s.parties : 0;
    if (cle === 'meilleurRang') return s.meilleurRang == null ? Infinity : -s.meilleurRang;
    return s[cle] as number;
  };

  const joueurs = $derived(
    statsJoueurs(app.donnees, filtre)
      .filter((s) => !recherche || nomJoueur(s.id).toLowerCase().includes(recherche.toLowerCase()))
      .sort((a, b) => (valeur(b, tri.cle) - valeur(a, tri.cle)) * (tri.desc ? 1 : -1) || nomJoueur(a.id).localeCompare(nomJoueur(b.id), 'fr')),
  );
  const recs = $derived(records({ ...app.donnees, concours: concoursFiltres }, nomParticipant));
  const resumes = $derived(concoursFiltres.map((c) => ({ c, r: resumeConcours(c) })));
  const totaux = $derived(
    resumes.reduce((t, { r }) => ({ belotes: t.belotes + r.belotes, capots: t.capots + r.capots, parties: t.parties + r.parties }), {
      belotes: 0,
      capots: 0,
      parties: 0,
    }),
  );

  function trier(cle: typeof tri.cle) {
    tri = tri.cle === cle ? { cle, desc: !tri.desc } : { cle, desc: true };
  }

  const colonnes: { cle: typeof tri.cle; label: string; titre?: string }[] = [
    { cle: 'concours', label: 'Concours' },
    { cle: 'parties', label: 'Parties' },
    { cle: 'victoires', label: 'Gagnées' },
    { cle: 'pourcentage', label: '% gagnées' },
    { cle: 'moyenne', label: 'Moy. points', titre: 'Points moyens par partie' },
    { cle: 'belotes', label: 'Belotes' },
    { cle: 'capots', label: 'Capots' },
    { cle: 'meilleurePartie', label: 'Meilleure', titre: 'Meilleure partie (points)' },
    { cle: 'meilleurRang', label: 'Meilleur rang' },
    { cle: 'premiers', label: '1res places' },
    { cle: 'podiums', label: 'Podiums' },
  ];
</script>

<div class="ligne entete">
  <h1>Statistiques</h1>
  <span class="espace"></span>
  <label>
    Période
    <select bind:value={annee}>
      <option value="">Toutes les années</option>
      {#each annees as a (a)}<option value={a}>{a}</option>{/each}
    </select>
  </label>
</div>

{#if concoursFiltres.length === 0}
  <p class="discret">Pas encore de données : les statistiques se remplissent au fil des concours.</p>
{:else}
  <div class="tuiles">
    <div class="carte tuile"><span class="chiffre">{concoursFiltres.length}</span><span>concours</span></div>
    <div class="carte tuile"><span class="chiffre">{totaux.parties}</span><span>parties jouées</span></div>
    <div class="carte tuile"><span class="chiffre">{totaux.belotes}</span><span>belotes</span></div>
    <div class="carte tuile"><span class="chiffre">{totaux.capots}</span><span>capots</span></div>
  </div>

  {#if recs.length}
    <h2>Records</h2>
    <div class="tuiles">
      {#each recs as r (r.libelle)}
        <div class="carte record">
          <span class="discret">{r.libelle}</span>
          <span class="chiffre">{r.valeur}</span>
          <strong>{r.qui}</strong>
          <span class="discret">{r.concours}</span>
        </div>
      {/each}
    </div>
  {/if}

  <div class="ligne">
    <h2>Joueurs</h2>
    <span class="espace"></span>
    <input type="search" placeholder="Rechercher un joueur…" bind:value={recherche} />
  </div>
  <p class="discret">
    Cliquez sur un titre de colonne pour trier. Les belotes et capots d'une équipe sont comptés pour ses deux joueurs. Rangs et podiums : concours terminés uniquement.
  </p>
  <div class="defile">
    <table class="liste">
      <thead>
        <tr>
          <th>Joueur</th>
          {#each colonnes as col (col.cle)}
            <th class="nb triable" title={col.titre} onclick={() => trier(col.cle)}>
              {col.label}{tri.cle === col.cle ? (tri.desc ? ' ▼' : ' ▲') : ''}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each joueurs as s (s.id)}
          <tr>
            <td>{nomJoueur(s.id)}</td>
            <td class="nb">{s.concours}</td>
            <td class="nb">{s.parties}</td>
            <td class="nb">{s.victoires}</td>
            <td class="nb">{s.parties ? Math.round((100 * s.victoires) / s.parties) : 0} %</td>
            <td class="nb">{s.parties ? Math.round(s.points / s.parties) : 0}</td>
            <td class="nb">{s.belotes}</td>
            <td class="nb">{s.capots}</td>
            <td class="nb">{s.meilleurePartie}</td>
            <td class="nb">{s.meilleurRang ?? '—'}</td>
            <td class="nb">{s.premiers}</td>
            <td class="nb">{s.podiums}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <h2 class="titre-concours">Concours</h2>
  <div class="defile">
    <table class="liste">
      <thead>
        <tr>
          <th>Date</th><th>Concours</th><th class="nb">Inscrits</th><th class="nb">Parties</th>
          <th class="nb">Belotes</th><th class="nb">Capots</th><th class="nb">Meilleure partie</th><th>Vainqueur</th>
        </tr>
      </thead>
      <tbody>
        {#each resumes as { c, r } (c.id)}
          <tr>
            <td>{dateFr(r.date)}</td>
            <td><a href="#/concours/{c.id}/classement">{r.nom}</a></td>
            <td class="nb">{r.participants}</td>
            <td class="nb">{r.parties}</td>
            <td class="nb">{r.belotes}</td>
            <td class="nb">{r.capots}</td>
            <td class="nb">{r.meilleurePartie}</td>
            <td>{r.vainqueur ? nomParticipant(r.vainqueur) : c.termine ? '—' : 'en cours'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<style>
  .entete {
    margin-bottom: 1rem;
  }
  .entete h1 {
    margin: 0;
  }
  .tuiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .tuile,
  .record {
    display: flex;
    flex-direction: column;
    margin: 0;
  }
  .chiffre {
    font-size: 2rem;
    font-weight: 700;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }
  th.triable {
    cursor: pointer;
    user-select: none;
  }
  th.triable:hover {
    color: var(--accent);
  }
  .titre-concours {
    margin-top: 1.5rem;
  }
</style>
