<script lang="ts">
  import { confirmer, informer } from '../lib/dialogue.svelte';
  import {
    app,
    fusionnerJoueurs,
    nomJoueur,
    nomsEquipe,
    normaliser,
    supprimerJoueur,
    trouverOuCreerJoueur,
    utilisationsJoueur,
  } from '../lib/store.svelte';
  import type { Id } from '../lib/types';

  let onglet = $state<'joueurs' | 'equipes'>('joueurs');
  let recherche = $state('');
  let nouveau = $state('');
  let edition = $state<Id | null>(null);
  let fusion = $state<{ doublon: Id; garde: Id | '' } | null>(null);

  const correspond = (s: string) => !recherche || normaliser(s).includes(normaliser(recherche));
  const joueurs = $derived(
    [...app.donnees.joueurs].filter((j) => correspond(j.nom)).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
  );
  const equipes = $derived(
    app.donnees.equipes
      .filter((e) => correspond(`${e.nom ?? ''} ${nomsEquipe(e)}`))
      .sort((a, b) => nomsEquipe(a).localeCompare(nomsEquipe(b), 'fr')),
  );

  function ajouter(e: SubmitEvent) {
    e.preventDefault();
    if (nouveau.trim()) trouverOuCreerJoueur(nouveau);
    nouveau = '';
  }

  async function supprimer(id: Id) {
    if (!(await confirmer(`Supprimer ${nomJoueur(id)} ?`, { valider: 'Supprimer', danger: true }))) return;
    try {
      supprimerJoueur(id);
    } catch (err) {
      informer('Suppression impossible', (err as Error).message);
    }
  }

  async function confirmerFusion() {
    if (!fusion?.garde) return;
    const ok = await confirmer(`Fusionner « ${nomJoueur(fusion.doublon)} » dans « ${nomJoueur(fusion.garde)} » ?`, {
      message: 'Les deux fiches deviennent une seule ; leurs résultats sont regroupés.',
      valider: 'Fusionner',
    });
    if (!ok || !fusion?.garde) return;
    fusionnerJoueurs(fusion.garde, fusion.doublon);
    fusion = null;
  }
</script>

<h1>Joueurs et équipes</h1>

<div class="ligne barre">
  <button class:principal={onglet === 'joueurs'} onclick={() => (onglet = 'joueurs')}>
    Joueurs ({app.donnees.joueurs.length})
  </button>
  <button class:principal={onglet === 'equipes'} onclick={() => (onglet = 'equipes')}>
    Équipes ({app.donnees.equipes.length})
  </button>
  <span class="espace"></span>
  <input type="search" placeholder="Rechercher…" bind:value={recherche} />
</div>

{#if onglet === 'joueurs'}
  <form class="ligne carte" onsubmit={ajouter}>
    <label>Ajouter un joueur <input bind:value={nouveau} placeholder="Nom Prénom" /></label>
    <button type="submit" disabled={!nouveau.trim()}>Ajouter</button>
    <span class="discret">Les joueurs sont aussi créés automatiquement lors des inscriptions.</span>
  </form>

  {#if fusion}
    <div class="carte alerte attention">
      <p><strong>Fusionner un doublon :</strong> « {nomJoueur(fusion.doublon)} » est la même personne que :</p>
      <div class="ligne">
        <select bind:value={fusion.garde}>
          <option value="">Choisir…</option>
          {#each app.donnees.joueurs.filter((j) => j.id !== fusion!.doublon).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')) as j (j.id)}
            <option value={j.id}>{j.nom}</option>
          {/each}
        </select>
        <button class="principal" disabled={!fusion.garde} onclick={confirmerFusion}>Fusionner</button>
        <button onclick={() => (fusion = null)}>Annuler</button>
      </div>
    </div>
  {/if}

  <div class="defile">
    <table class="liste">
      <thead>
        <tr><th>Nom</th><th>Téléphone</th><th>Notes</th><th class="nb">Concours</th><th></th></tr>
      </thead>
      <tbody>
        {#each joueurs as j (j.id)}
          {@const nb = utilisationsJoueur(j.id).length}
          <tr>
            {#if edition === j.id}
              <td><input bind:value={j.nom} /></td>
              <td><input bind:value={j.telephone} /></td>
              <td><input bind:value={j.notes} /></td>
              <td class="nb">{nb}</td>
              <td class="nb"><button class="principal petit" onclick={() => (edition = null)}>OK</button></td>
            {:else}
              <td>{j.nom}</td>
              <td>{j.telephone ?? ''}</td>
              <td class="discret">{j.notes ?? ''}</td>
              <td class="nb">{nb}</td>
              <td class="nb actions">
                <button class="petit" onclick={() => (edition = j.id)}>Modifier</button>
                {#if app.donnees.joueurs.length > 1}<button class="petit" onclick={() => (fusion = { doublon: j.id, garde: '' })} title="Regrouper avec une autre fiche de la même personne">Doublon</button>{/if}
                {#if nb === 0}<button class="petit danger" onclick={() => supprimer(j.id)}>Supprimer</button>{/if}
              </td>
            {/if}
          </tr>
        {:else}
          <tr><td colspan="5" class="discret">Aucun joueur.</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <p class="discret">Les équipes sont enregistrées lors des inscriptions et reconnues d'un concours à l'autre.</p>
  <div class="defile">
    <table class="liste">
      <thead><tr><th>Nom d'équipe</th><th>Joueurs</th><th class="nb">Concours</th></tr></thead>
      <tbody>
        {#each equipes as e (e.id)}
          <tr>
            <td><input bind:value={e.nom} placeholder="(sans nom)" /></td>
            <td>{nomsEquipe(e)}</td>
            <td class="nb">{app.donnees.concours.filter((c) => c.participants.some((p) => p.id === e.id)).length}</td>
          </tr>
        {:else}
          <tr><td colspan="3" class="discret">Aucune équipe.</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<style>
  .barre {
    margin-bottom: 1rem;
  }
  .actions {
    white-space: nowrap;
  }
  .actions button + button {
    margin-left: 0.3rem;
  }
  td input {
    width: 100%;
  }
</style>
