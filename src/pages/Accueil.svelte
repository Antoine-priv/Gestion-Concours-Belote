<script lang="ts">
  import { dateFr } from '../lib/format';
  import { aller } from '../lib/navigation.svelte';
  import { app, nbPartiesPrevues, nomParticipant } from '../lib/store.svelte';
  import { calculerClassement } from '../lib/classement';
  import type { Concours } from '../lib/types';

  const enCours = $derived(app.donnees.concours.filter((c) => !c.termine));
  const termines = $derived(app.donnees.concours.filter((c) => c.termine));

  function etat(c: Concours): string {
    if (c.parties.length === 0) return 'Inscriptions';
    const p = c.parties[c.parties.length - 1];
    const saisies = p.tables.filter((t) => t.resultat).length;
    return `Partie ${p.numero} / ${nbPartiesPrevues(c)} — ${saisies}/${p.tables.length} tables saisies`;
  }

  function vainqueur(c: Concours): string {
    const premier = calculerClassement(c)[0];
    return premier ? nomParticipant(premier.id) : '—';
  }
</script>

<div class="ligne entete">
  <h1>Concours</h1>
  <span class="espace"></span>
  <button class="principal" onclick={() => aller('/nouveau')}>+ Nouveau concours</button>
</div>

{#if app.donnees.concours.length === 0}
  <div class="carte vide">
    <h2>Bienvenue !</h2>
    <p>Aucun concours pour l'instant. Commencez par créer un concours, puis inscrivez les équipes.</p>
    <p class="discret">
      Toutes les données restent sur cet ordinateur. Pensez à activer la sauvegarde automatique dans un fichier
      (menu <a href="#/sauvegarde">Sauvegarde</a>).
    </p>
    <button class="principal" onclick={() => aller('/nouveau')}>Créer mon premier concours</button>
  </div>
{/if}

{#if enCours.length}
  <h2>En cours</h2>
  <div class="grille">
    {#each enCours as c (c.id)}
      <a class="carte concours" href="#/concours/{c.id}">
        <strong>{c.nom}</strong>
        <span class="discret">{dateFr(c.date)}{c.lieu ? ` — ${c.lieu}` : ''}</span>
        <span>{c.participants.length} équipe{c.participants.length > 1 ? 's' : ''}</span>
        <span class="pastille attente">{etat(c)}</span>
      </a>
    {/each}
  </div>
{/if}

{#if termines.length}
  <h2>Terminés</h2>
  <div class="defile">
    <table class="liste">
      <thead>
        <tr><th>Date</th><th>Concours</th><th class="nb">Inscrits</th><th>Vainqueur</th></tr>
      </thead>
      <tbody>
        {#each termines as c (c.id)}
          <tr class="cliquable" onclick={() => aller(`/concours/${c.id}/classement`)}>
            <td>{dateFr(c.date)}</td>
            <td>{c.nom}</td>
            <td class="nb">{c.participants.length}</td>
            <td>{vainqueur(c)}</td>
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
  .grille {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .concours {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    text-decoration: none;
    color: inherit;
    margin: 0;
  }
  .concours:hover {
    border-color: var(--accent);
  }
  .concours .pastille {
    align-self: flex-start;
  }
  .vide {
    max-width: 640px;
  }
</style>
