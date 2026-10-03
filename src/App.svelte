<script lang="ts">
  import Impression from './components/Impression.svelte';
  import { impression, route } from './lib/navigation.svelte';
  import { sauvegarde } from './lib/store.svelte';
  import Accueil from './pages/Accueil.svelte';
  import Aide from './pages/Aide.svelte';
  import ConcoursPage from './pages/ConcoursPage.svelte';
  import Ecran from './pages/Ecran.svelte';
  import Joueurs from './pages/Joueurs.svelte';
  import NouveauConcours from './pages/NouveauConcours.svelte';
  import Sauvegarde from './pages/Sauvegarde.svelte';
  import Stats from './pages/Stats.svelte';

  const parties = $derived(route.chemin.split('/').filter(Boolean));
  const section = $derived(parties[0] ?? '');

  const liens = [
    { href: '#/', label: 'Concours', actif: ['', 'concours', 'nouveau'] },
    { href: '#/joueurs', label: 'Joueurs et équipes', actif: ['joueurs'] },
    { href: '#/stats', label: 'Statistiques', actif: ['stats'] },
    { href: '#/sauvegarde', label: 'Sauvegarde', actif: ['sauvegarde'] },
    { href: '#/aide', label: 'Aide', actif: ['aide'] },
  ];
</script>

{#if section === 'ecran' && parties[1]}
  <Ecran id={parties[1]} />
{:else}
  <div class="app">
    <header>
      <a class="marque" href="#/"><span class="pique" aria-hidden="true">♠</span> Concours de belote</a>
      <nav>
        {#each liens as l (l.href)}
          <a href={l.href} class:actif={l.actif.includes(section)}>{l.label}</a>
        {/each}
      </nav>
      <a class="etat-sauvegarde" href="#/sauvegarde">
        {#if sauvegarde.aReautoriser}
          <span class="pastille attente">Sauvegarde fichier en pause</span>
        {:else if sauvegarde.erreur}
          <span class="pastille ko">Erreur de sauvegarde</span>
        {:else if sauvegarde.fichier}
          <span class="pastille ok">Sauvegardé dans {sauvegarde.fichier}</span>
        {:else}
          <span class="pastille">Sauvegardé dans le navigateur</span>
        {/if}
      </a>
    </header>

    <main>
      {#if section === 'concours' && parties[1]}
        <ConcoursPage id={parties[1]} onglet={parties[2] ?? ''} />
      {:else if section === 'nouveau'}
        <NouveauConcours />
      {:else if section === 'joueurs'}
        <Joueurs />
      {:else if section === 'stats'}
        <Stats />
      {:else if section === 'sauvegarde'}
        <Sauvegarde />
      {:else if section === 'aide'}
        <Aide />
      {:else}
        <Accueil />
      {/if}
    </main>
  </div>

  <div class="zone-impression">
    {#if impression.vue}
      <Impression vue={impression.vue} />
    {/if}
  </div>
{/if}

<style>
  header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 0.6rem 1.5rem;
    background: var(--accent);
    color: #fff;
    flex-wrap: wrap;
  }
  .marque {
    color: #fff;
    font-weight: 700;
    font-size: 1.15rem;
    text-decoration: none;
  }
  .pique {
    font-size: 1.3em;
  }
  nav {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }
  nav a {
    color: #e6f2ec;
    text-decoration: none;
    padding: 0.35em 0.8em;
    border-radius: 6px;
  }
  nav a:hover {
    background: rgb(255 255 255 / 0.12);
  }
  nav a.actif {
    background: rgb(255 255 255 / 0.2);
    color: #fff;
    font-weight: 600;
  }
  .etat-sauvegarde {
    margin-left: auto;
    text-decoration: none;
  }
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem;
  }
</style>
