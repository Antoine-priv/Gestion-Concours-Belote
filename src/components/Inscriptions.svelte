<script lang="ts">
  import { imprimer } from '../lib/navigation.svelte';
  import {
    aJoue,
    abandonner,
    app,
    chercherJoueur,
    desinscrire,
    equipe,
    inscrire,
    lancerTirage,
    nomParticipant,
    nomsEquipe,
    normaliser,
    renumeroter,
    trouverOuCreerEquipe,
    trouverOuCreerJoueur,
  } from '../lib/store.svelte';
  import type { Concours, Id } from '../lib/types';
  import { aller } from '../lib/navigation.svelte';

  let { concours: c }: { concours: Concours } = $props();

  const melee = $derived(c.reglages.mode === 'melee');
  let j1 = $state('');
  let j2 = $state('');
  let nomEq = $state('');
  let erreur = $state('');
  let message = $state('');
  let recherche = $state('');
  let champ1: HTMLInputElement | undefined = $state();

  const nomsJoueurs = $derived([...app.donnees.joueurs].map((j) => j.nom).sort((a, b) => a.localeCompare(b, 'fr')));

  /** Joueurs déjà inscrits à ce concours (directement ou via leur équipe). */
  const joueursInscrits = $derived(
    new Set(
      c.participants.flatMap((p) => (melee ? [p.id] : (equipe(p.id)?.joueurs ?? []))),
    ),
  );

  const liste = $derived(
    [...c.participants]
      .sort((a, b) => a.numero - b.numero)
      .filter((p) => !recherche || normaliser(texteRecherche(p.id)).includes(normaliser(recherche))),
  );

  function texteRecherche(id: Id) {
    const e = equipe(id);
    return melee || !e ? nomParticipant(c, id) : `${e.nom ?? ''} ${nomsEquipe(e)}`;
  }

  /** Quand on tape le premier joueur d'une équipe connue, on propose son partenaire habituel. */
  function suggererPartenaire() {
    if (melee || j2) return;
    const cle = normaliser(j1);
    const j = app.donnees.joueurs.find((x) => normaliser(x.nom) === cle);
    if (!j) return;
    const habituelles = app.donnees.equipes.filter((e) => e.joueurs.includes(j.id));
    if (habituelles.length !== 1) return;
    const e = habituelles[0];
    const autre = e.joueurs.find((x) => x !== j.id)!;
    j2 = app.donnees.joueurs.find((x) => x.id === autre)?.nom ?? '';
    if (e.nom && !nomEq) nomEq = e.nom;
  }

  function ajouter(e: SubmitEvent) {
    e.preventDefault();
    erreur = '';
    message = '';
    try {
      if (melee) {
        if (!j1.trim()) return;
        if (joueursInscrits.has(chercherJoueur(j1)?.id ?? '')) {
          erreur = `${j1} est déjà inscrit(e).`;
          return;
        }
        const j = trouverOuCreerJoueur(j1);
        inscrire(c, j.id);
        message = `${j.nom} inscrit(e) avec le n° ${c.participants.at(-1)!.numero}.`;
      } else {
        if (!j1.trim() || !j2.trim()) {
          erreur = 'Indiquez les deux joueurs de l’équipe.';
          return;
        }
        if (normaliser(j1) === normaliser(j2)) {
          erreur = 'Les deux joueurs doivent être différents.';
          return;
        }
        const deja = [j1, j2].map(chercherJoueur).filter((j) => j && joueursInscrits.has(j.id));
        if (deja.length) {
          erreur = `${deja.map((j) => j!.nom).join(' et ')} ${deja.length > 1 ? 'sont' : 'est'} déjà inscrit(s) dans une autre équipe.`;
          return;
        }
        const a = trouverOuCreerJoueur(j1);
        const b = trouverOuCreerJoueur(j2);
        const eq = trouverOuCreerEquipe(a.id, b.id, nomEq.trim() || undefined);
        inscrire(c, eq.id);
        message = `Équipe n° ${c.participants.at(-1)!.numero} inscrite : ${nomParticipant(c, eq.id)}.`;
      }
      j1 = j2 = nomEq = '';
      champ1?.focus();
    } catch (err) {
      erreur = (err as Error).message;
    }
  }

  function retirer(id: Id) {
    try {
      if (!confirm(`Retirer « ${nomParticipant(c, id)} » du concours ?`)) return;
      desinscrire(c, id);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  function changerAbandon(id: Id, valeur: string) {
    abandonner(c, id, valeur ? Number(valeur) : undefined);
  }

  const minimum = $derived(melee ? 4 : 2);
  const prochaine = $derived(c.parties.length + 1);

  function tirer() {
    const revanches = lancerTirage(c);
    if (revanches) alert(`Attention : ${revanches} revanche(s) n'ont pas pu être évitées.`);
    aller(`/concours/${c.id}/partie-${c.parties.length}`);
  }
</script>

<div class="disposition">
  <div>
    <form class="carte" onsubmit={ajouter}>
      <h2>{melee ? 'Inscrire un joueur' : 'Inscrire une équipe'}</h2>
      <datalist id="joueurs-connus">
        {#each nomsJoueurs as n (n)}<option value={n}></option>{/each}
      </datalist>
      <div class="pile">
        <label class="champ">
          <span>{melee ? 'Nom du joueur' : 'Joueur 1'}</span>
          <input
            bind:this={champ1}
            bind:value={j1}
            list="joueurs-connus"
            placeholder="Nom Prénom"
            autocomplete="off"
            onchange={suggererPartenaire} />
        </label>
        {#if !melee}
          <label class="champ">
            <span>Joueur 2</span>
            <input bind:value={j2} list="joueurs-connus" placeholder="Nom Prénom" autocomplete="off" />
          </label>
          <label class="champ">
            <span>Nom de l'équipe <small>(facultatif)</small></span>
            <input bind:value={nomEq} placeholder="Les As de pique" autocomplete="off" />
          </label>
        {/if}
        {#if erreur}<div class="alerte erreur">{erreur}</div>{/if}
        {#if message}<div class="alerte info">{message}</div>{/if}
        <button class="principal" type="submit">Inscrire</button>
        <small class="discret">
          Les joueurs déjà connus sont proposés pendant la saisie. Un nouveau nom crée automatiquement une fiche joueur.
        </small>
      </div>
    </form>

    <section class="carte">
      <h2>{c.parties.length ? `Partie ${prochaine}` : 'Prêt à commencer ?'}</h2>
      {#if c.parties.length === 0}
        <p>
          Quand tout le monde est inscrit, lancez le tirage au sort de la 1re partie.
          {#if c.participants.length % (melee ? 4 : 2) !== 0 && c.participants.length >= minimum}
            <br /><span class="discret">
              {melee
                ? `${c.participants.length % 4} joueur(s) seront exempts à chaque partie.`
                : 'Nombre impair : une équipe sera exempte à chaque partie.'}
            </span>
          {/if}
        </p>
        <button class="principal" disabled={c.participants.length < minimum} onclick={tirer}>
          Tirage au sort de la partie 1
        </button>
        {#if c.participants.length < minimum}
          <p class="discret">Il faut au moins {minimum} {melee ? 'joueurs' : 'équipes'}.</p>
        {/if}
      {:else}
        <p class="discret">
          Les inscriptions restent ouvertes : un retardataire jouera à partir de la prochaine partie, avec 0 point.
        </p>
      {/if}
    </section>
  </div>

  <section class="carte">
    <div class="ligne">
      <h2>{c.participants.length} {melee ? 'joueurs inscrits' : 'équipes inscrites'}</h2>
      <span class="espace"></span>
      <input type="search" placeholder="Rechercher…" bind:value={recherche} />
      <button onclick={() => imprimer({ type: 'inscrits', concours: c.id })}>Imprimer</button>
      {#if c.parties.length === 0 && c.participants.length}
        <button onclick={() => renumeroter(c)} title="Renuméroter 1, 2, 3… sans trou">Renuméroter</button>
      {/if}
    </div>
    {#if c.participants.length === 0}
      <p class="discret">Personne n'est encore inscrit.</p>
    {:else}
      <div class="defile">
        <table class="liste">
          <thead>
            <tr>
              <th class="nb">N°</th>
              <th>{melee ? 'Joueur' : 'Équipe'}</th>
              {#if c.parties.length}<th>Abandon</th>{/if}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each liste as p (p.id)}
              {@const eq = melee ? undefined : equipe(p.id)}
              <tr class:abandon={p.abandonPartie != null}>
                <td class="nb"><strong>{p.numero}</strong></td>
                <td>
                  {#if eq?.nom}<strong>{eq.nom}</strong> <span class="discret">— {nomsEquipe(eq)}</span>
                  {:else}{nomParticipant(c, p.id)}{/if}
                </td>
                {#if c.parties.length}
                  <td>
                    <select
                      value={p.abandonPartie ?? ''}
                      onchange={(e) => changerAbandon(p.id, e.currentTarget.value)}
                      title="À partir de quelle partie ne joue-t-il plus ?">
                      <option value="">Joue</option>
                      {#each Array.from({ length: c.reglages.nbParties }, (_, i) => i + 1) as n (n)}
                        {#if n > c.parties.length || n === p.abandonPartie}
                          <option value={n}>Ne joue plus dès la partie {n}</option>
                        {/if}
                      {/each}
                    </select>
                  </td>
                {/if}
                <td class="nb">
                  {#if !aJoue(c, p.id)}
                    <button class="petit danger" onclick={() => retirer(p.id)}>Retirer</button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</div>

<style>
  .disposition {
    display: grid;
    grid-template-columns: minmax(300px, 380px) 1fr;
    gap: 1rem;
    align-items: start;
  }
  @media (max-width: 860px) {
    .disposition {
      grid-template-columns: 1fr;
    }
  }
  .ligne h2 {
    margin: 0;
  }
  .ligne {
    margin-bottom: 0.75rem;
  }
  tr.abandon td {
    color: var(--texte-2);
    text-decoration: line-through;
  }
  tr.abandon td select {
    text-decoration: none;
  }
</style>
