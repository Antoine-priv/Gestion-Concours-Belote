<script lang="ts">
  import { onMount, tick } from 'svelte';
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
    nbPartiesPrevues,
    nomJoueur,
    nomParticipant,
    nomsEquipe,
    normaliser,
    renumeroter,
    trouverOuCreerEquipe,
    trouverOuCreerJoueur,
  } from '../lib/store.svelte';
  import type { Concours, Equipe, Id } from '../lib/types';
  import { aller } from '../lib/navigation.svelte';
  import ChampSuggestions, { type Suggestion } from './ChampSuggestions.svelte';

  let { concours: c }: { concours: Concours } = $props();

  let j1 = $state('');
  let j2 = $state('');
  let nomEq = $state('');
  let erreur = $state('');
  let message = $state('');
  let recherche = $state('');
  let champ1: HTMLInputElement | undefined = $state();
  let champ2: HTMLInputElement | undefined = $state();
  let bouton: HTMLButtonElement | undefined = $state();
  let boutonActif = $state(false);

  // On peut taper le premier nom dès l'arrivée sur la page.
  onMount(() => champ1?.focus());
  /** Le formulaire est rempli et le bouton a le focus : il ne reste qu'à valider. */
  const pret = $derived(boutonActif && !!j1.trim() && !!j2.trim());

  /** Joueurs déjà inscrits à ce concours (directement ou via leur équipe). */
  const joueursInscrits = $derived(
    new Set(
      c.participants.flatMap((p) => equipe(p.id)?.joueurs ?? []),
    ),
  );

  const liste = $derived(
    [...c.participants]
      .sort((a, b) => a.numero - b.numero)
      .filter((p) => !recherche || normaliser(texteRecherche(p.id)).includes(normaliser(recherche))),
  );

  function texteRecherche(id: Id) {
    const e = equipe(id);
    return e ? `${e.nom ?? ''} ${nomsEquipe(e)}` : '';
  }

  /** 2 : un mot du nom commence par la saisie ; 1 : le nom la contient ; 0 : aucun rapport. */
  function correspond(nom: string, q: string): number {
    const n = normaliser(nom);
    if (n.split(' ').some((m) => m.startsWith(q)) || n.startsWith(q)) return 2;
    return n.includes(q) ? 1 : 0;
  }

  const nbConcours = (equipeId: Id) => app.donnees.concours.filter((x) => x.participants.some((p) => p.id === equipeId)).length;

  interface Proposition {
    rang: number;
    s: Suggestion;
    action: () => void;
  }

  function trier(l: Proposition[]): Proposition[] {
    return l.sort((x, y) => y.rang - x.rang || x.s.titre.localeCompare(y.s.titre, 'fr')).slice(0, 8);
  }

  /** Joueur 1 : les équipes habituelles d'abord (on remplit tout d'un coup), puis les joueurs seuls. */
  const propositions1 = $derived.by(() => {
    const q = normaliser(j1);
    if (!q) return [];
    const res: Proposition[] = [];
    for (const e of app.donnees.equipes) {
      if (e.joueurs.some((id) => joueursInscrits.has(id))) continue;
      const scores = e.joueurs.map((id) => correspond(nomJoueur(id), q));
      const meilleur = Math.max(...scores, e.nom ? correspond(e.nom, q) : 0);
      if (!meilleur) continue;
      const [a, b] = scores[1] > scores[0] ? [e.joueurs[1], e.joueurs[0]] : e.joueurs;
      res.push({
        rang: meilleur * 1000 + nbConcours(e.id),
        s: { cle: `e${e.id}`, titre: `${nomJoueur(a)} / ${nomJoueur(b)}`, badge: 'équipe', detail: e.nom },
        action: () => choisirEquipe(e, a, b),
      });
    }
    for (const j of app.donnees.joueurs) {
      if (joueursInscrits.has(j.id)) continue;
      const sc = correspond(j.nom, q);
      if (!sc) continue;
      res.push({
        rang: sc * 1000 - 500,
        s: { cle: `j${j.id}`, titre: j.nom, detail: 'Seul — choisir ensuite son partenaire' },
        action: () => choisirJoueur1(j.nom),
      });
    }
    return trier(res);
  });

  const propositions2 = $derived.by(() => {
    const q = normaliser(j2);
    if (!q) return [];
    const res: Proposition[] = [];
    for (const j of app.donnees.joueurs) {
      if (joueursInscrits.has(j.id) || normaliser(j.nom) === normaliser(j1)) continue;
      const sc = correspond(j.nom, q);
      if (sc) res.push({ rang: sc * 1000, s: { cle: `j${j.id}`, titre: j.nom }, action: () => choisirJoueur2(j.nom) });
    }
    return trier(res);
  });

  async function choisirEquipe(e: Equipe, a: Id, b: Id) {
    j1 = nomJoueur(a);
    j2 = nomJoueur(b);
    nomEq = e.nom ?? '';
    await tick();
    bouton?.focus();
  }

  async function choisirJoueur1(nom: string) {
    j1 = nom;
    await tick();
    champ2?.focus();
  }

  async function choisirJoueur2(nom: string) {
    j2 = nom;
    // Si ces deux joueurs ont déjà joué ensemble, on reprend le nom de leur équipe.
    const a = chercherJoueur(j1);
    const b = chercherJoueur(nom);
    const e = a && b ? app.donnees.equipes.find((x) => x.joueurs.includes(a.id) && x.joueurs.includes(b.id)) : undefined;
    if (e?.nom && !nomEq) nomEq = e.nom;
    await tick();
    bouton?.focus();
  }

  const choisir = (l: Proposition[]) => (s: Suggestion) => l.find((p) => p.s.cle === s.cle)?.action();

  /** Entrée sur le joueur 1 sans suggestion : on passe au joueur 2 au lieu d'inscrire. */
  function entree1(e: KeyboardEvent) {
    if (!j1.trim() || j2.trim()) return;
    e.preventDefault();
    champ2?.focus();
  }

  function entree2(e: KeyboardEvent) {
    if (!j2.trim()) e.preventDefault();
  }

  function ajouter(e: SubmitEvent) {
    e.preventDefault();
    erreur = '';
    message = '';
    try {
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
      message = `Équipe n° ${c.participants.at(-1)!.numero} inscrite : ${nomParticipant(eq.id)}.`;
      j1 = j2 = nomEq = '';
      champ1?.focus();
    } catch (err) {
      erreur = (err as Error).message;
    }
  }

  function retirer(id: Id) {
    try {
      if (!confirm(`Retirer « ${nomParticipant(id)} » du concours ?`)) return;
      desinscrire(c, id);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  function changerAbandon(id: Id, valeur: string) {
    abandonner(c, id, valeur ? Number(valeur) : undefined);
  }

  const formulaireComplet = $derived(!!j1.trim() && !!j2.trim());
  /** Des numéros manquent (après un retrait) : la renumérotation a un effet. */
  const numerosATrous = $derived(
    [...c.participants].sort((a, b) => a.numero - b.numero).some((p, i) => p.numero !== i + 1),
  );
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
      <h2>Inscrire une équipe</h2>
      <div class="pile">
        <div class="champ">
          <label for="joueur1">Joueur 1</label>
          <ChampSuggestions
            id="joueur1"
            bind:value={j1}
            bind:champ={champ1}
            suggestions={propositions1.map((p) => p.s)}
            onchoisir={choisir(propositions1)}
            onentree={entree1}
            placeholder="Nom Prénom, ou nom d’équipe" />
        </div>
        <div class="champ">
            <label for="joueur2">Joueur 2</label>
            <ChampSuggestions
              id="joueur2"
              bind:value={j2}
              bind:champ={champ2}
              suggestions={propositions2.map((p) => p.s)}
              onchoisir={choisir(propositions2)}
              onentree={entree2}
              placeholder="Nom Prénom" />
          </div>
          <label class="champ">
            <span>Nom de l'équipe <small>(facultatif)</small></span>
            <input bind:value={nomEq} placeholder="Les As de pique" autocomplete="off" />
          </label>
        {#if erreur}<div class="alerte erreur">{erreur}</div>{/if}
        {#if message}<div class="alerte info">{message}</div>{/if}
        <button
          class="principal"
          type="submit"
          disabled={!formulaireComplet}
          title={formulaireComplet ? '' : 'Indiquez les deux joueurs'}
          bind:this={bouton}
          onfocus={() => (boutonActif = true)}
          onblur={() => (boutonActif = false)}>Inscrire</button>
        {#if pret}
          <small class="pret">Vérifiez puis appuyez sur <kbd>Entrée</kbd> pour inscrire.</small>
        {/if}
        <small class="discret">
          Tapez le nom d’un joueur : ses équipes habituelles sont proposées et remplissent tout d’un coup. Un nouveau nom
          crée automatiquement une fiche joueur.
        </small>
      </div>
    </form>

    <section class="carte">
      <h2>{c.parties.length ? `Partie ${prochaine}` : 'Prêt à commencer ?'}</h2>
      {#if c.parties.length === 0}
        <p>
          Quand tout le monde est inscrit, lancez le tirage au sort de la 1re partie.
          {#if c.participants.length % 2 === 1 && c.participants.length >= 2}
            <br /><span class="discret">Nombre impair : une équipe sera exempte à chaque partie.</span>
          {/if}
        </p>
        <button class="principal" disabled={c.participants.length < 2} onclick={tirer}>
          Tirage au sort de la partie 1
        </button>
        {#if c.participants.length < 2}
          <p class="discret">Il faut au moins 2 équipes.</p>
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
      <h2>{c.participants.length} équipe{c.participants.length > 1 ? 's' : ''} inscrite{c.participants.length > 1 ? 's' : ''}</h2>
      <span class="espace"></span>
      {#if c.participants.length}
        <input type="search" placeholder="Rechercher…" bind:value={recherche} />
        <button onclick={() => imprimer({ type: 'inscrits', concours: c.id })}>Imprimer</button>
      {/if}
      {#if c.parties.length === 0 && numerosATrous}
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
              <th>Équipe</th>
              {#if c.parties.length}<th>Abandon</th>{/if}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each liste as p (p.id)}
              {@const eq = equipe(p.id)}
              <tr class:abandon={p.abandonPartie != null}>
                <td class="nb"><strong>{p.numero}</strong></td>
                <td>
                  {#if eq?.nom}<strong>{eq.nom}</strong> <span class="discret">— {nomsEquipe(eq)}</span>
                  {:else}{nomParticipant(p.id)}{/if}
                </td>
                {#if c.parties.length}
                  <td>
                    <select
                      value={p.abandonPartie ?? ''}
                      onchange={(e) => changerAbandon(p.id, e.currentTarget.value)}
                      title="À partir de quelle partie ne joue-t-il plus ?">
                      <option value="">Joue</option>
                      {#each Array.from({ length: nbPartiesPrevues(c) }, (_, i) => i + 1) as n (n)}
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
  .champ > label {
    font-weight: 600;
    font-size: 0.93rem;
  }
  .pret {
    color: var(--accent-fort);
    font-weight: 600;
  }
  kbd {
    font: inherit;
    font-size: 0.85em;
    padding: 0 0.35em;
    border: 1px solid var(--bord);
    border-bottom-width: 2px;
    border-radius: 4px;
    background: var(--surface-2);
  }
  tr.abandon td {
    color: var(--texte-2);
    text-decoration: line-through;
  }
  tr.abandon td select {
    text-decoration: none;
  }
</style>
