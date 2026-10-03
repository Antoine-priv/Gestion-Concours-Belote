<script lang="ts">
  import { LIBELLES_CRITERES, TOUS_CRITERES } from '../lib/reglages';
  import type { Critere, Reglages } from '../lib/types';

  let { reglages = $bindable(), modeVerrouille = false }: { reglages: Reglages; modeVerrouille?: boolean } = $props();

  const principal = $derived<Critere>(reglages.classement === 'victoires' ? 'victoires' : 'points');
  const disponibles = $derived(TOUS_CRITERES.filter((k) => k !== principal && !reglages.departage.includes(k)));
  const departageAffiche = $derived(reglages.departage.filter((k) => k !== principal));

  function deplacer(k: Critere, sens: -1 | 1) {
    const l = reglages.departage.filter((x) => x !== principal);
    const i = l.indexOf(k);
    const j = i + sens;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    reglages.departage = l;
  }

  let lotsTexte = $state(reglages.lots.join('\n'));
  $effect(() => {
    const l = lotsTexte.split('\n').map((s) => s.trim());
    while (l.length && !l[l.length - 1]) l.pop();
    reglages.lots = l;
  });
</script>

<section class="carte">
  <h2>Type de concours</h2>
  <div class="pile">
    <label>
      <input type="radio" bind:group={reglages.mode} value="equipes" disabled={modeVerrouille} />
      <span><strong>Équipes formées</strong> — chaque équipe de 2 joueurs reste ensemble tout le concours</span>
    </label>
    <label>
      <input type="radio" bind:group={reglages.mode} value="melee" disabled={modeVerrouille} />
      <span><strong>À la mêlée</strong> — on inscrit des joueurs seuls, les partenaires sont tirés au sort à chaque partie</span>
    </label>
    {#if modeVerrouille}
      <small class="discret">Le type ne peut plus être changé une fois des inscriptions faites.</small>
    {/if}
  </div>
</section>

<section class="carte">
  <h2>Déroulement des parties</h2>
  <div class="grille-champs">
    <label class="champ">
      <span>Nombre de parties</span>
      <input type="number" min="1" max="20" bind:value={reglages.nbParties} />
    </label>
    <div class="champ">
      <span>Fin d'une partie</span>
      <label><input type="radio" bind:group={reglages.finPartie} value="donnes" /> Nombre de donnes fixe</label>
      <label><input type="radio" bind:group={reglages.finPartie} value="temps" /> Au temps</label>
      <label><input type="radio" bind:group={reglages.finPartie} value="score" /> Score à atteindre</label>
    </div>
    {#if reglages.finPartie === 'donnes'}
      <label class="champ">
        <span>Nombre de donnes par partie</span>
        <input type="number" min="1" bind:value={reglages.nbDonnes} />
      </label>
    {:else if reglages.finPartie === 'score'}
      <label class="champ">
        <span>Score à atteindre</span>
        <input type="number" min="1" step="10" bind:value={reglages.scoreCible} />
      </label>
    {/if}
    <label class="champ">
      <span>Durée du chronomètre (minutes)</span>
      <input type="number" min="1" bind:value={reglages.dureeMinutes} />
      <small>
        {reglages.finPartie === 'temps' ? 'Durée de chaque partie.' : 'Facultatif : sert seulement si vous lancez le chrono.'}
      </small>
    </label>
  </div>
</section>

<section class="carte">
  <h2>Comptage des points</h2>
  <div class="grille-champs">
    <div class="champ">
      <span>Valeur du capot</span>
      <label><input type="radio" bind:group={reglages.capot} value={252} /> 252 points</label>
      <label><input type="radio" bind:group={reglages.capot} value={250} /> 250 points</label>
    </div>
    <div class="champ">
      <span>Points</span>
      <label><input type="radio" bind:group={reglages.pointsArrondis} value={false} /> Réels (162 par donne)</label>
      <label><input type="radio" bind:group={reglages.pointsArrondis} value={true} /> Arrondis (16 par donne)</label>
    </div>
    <div class="champ">
      <span>Annonces</span>
      <label><input type="checkbox" bind:checked={reglages.annonces} /> Compter les annonces (tierce, cinquante, cent, carré)</label>
      <small>La belote-rebelote est toujours comptée à part.</small>
    </div>
    <div class="champ">
      <span>Vérification de la saisie</span>
      <label><input type="radio" bind:group={reglages.controle} value="complet" /> Complète (total exact)</label>
      <label><input type="radio" bind:group={reglages.controle} value="dernierChiffre" /> Dernier chiffre du total</label>
      <label><input type="radio" bind:group={reglages.controle} value="aucun" /> Aucune</label>
      <small>
        {#if reglages.controle === 'complet'}
          Total = donnes × {reglages.pointsArrondis ? 16 : 162} + belotes + capots{reglages.annonces ? ' + annonces' : ''}.
        {:else if reglages.controle === 'dernierChiffre'}
          Méthode papier : en 12 donnes, le total doit finir par 4. Belotes et capots facultatifs.
        {/if}
      </small>
    </div>
  </div>
</section>

<section class="carte">
  <h2>Classement</h2>
  <div class="grille-champs">
    <div class="champ">
      <span>Classer d'abord par</span>
      <label><input type="radio" bind:group={reglages.classement} value="victoires" /> Nombre de parties gagnées</label>
      <label><input type="radio" bind:group={reglages.classement} value="points" /> Total des points</label>
    </div>
    <div class="champ">
      <span>En cas d'égalité, départager par (dans l'ordre)</span>
      <ol class="criteres">
        {#each departageAffiche as k, i (k)}
          <li>
            <span>{LIBELLES_CRITERES[k]}</span>
            <span class="espace"></span>
            <button class="petit" type="button" disabled={i === 0} onclick={() => deplacer(k, -1)} aria-label="Monter">↑</button>
            <button class="petit" type="button" disabled={i === departageAffiche.length - 1} onclick={() => deplacer(k, 1)} aria-label="Descendre">↓</button>
            <button
              class="petit danger"
              type="button"
              onclick={() => (reglages.departage = reglages.departage.filter((x) => x !== k))}
              aria-label="Retirer">✕</button>
          </li>
        {/each}
      </ol>
      {#if disponibles.length}
        <select
          onchange={(e) => {
            const v = e.currentTarget.value as Critere;
            if (v) reglages.departage = [...departageAffiche, v];
            e.currentTarget.value = '';
          }}>
          <option value="">+ Ajouter un critère…</option>
          {#each disponibles as k (k)}
            <option value={k}>{LIBELLES_CRITERES[k]}</option>
          {/each}
        </select>
      {/if}
      <small>Sans « Tirage au sort » en dernier, des équipes peuvent rester ex æquo.</small>
    </div>
  </div>
</section>

<section class="carte">
  <h2>Tirage des tables</h2>
  <div class="grille-champs">
    <div class="champ">
      <span>À partir de la 2e partie</span>
      <label><input type="radio" bind:group={reglages.appariement} value="classement" /> Selon le classement (1er contre 2e, 3e contre 4e…)</label>
      <label><input type="radio" bind:group={reglages.appariement} value="hasard" /> Nouveau tirage au sort</label>
      <small>La 1re partie est toujours tirée au sort.</small>
    </div>
    <div class="champ">
      <span>Revanches</span>
      <label>
        <input type="checkbox" bind:checked={reglages.eviterRevanche} />
        {reglages.mode === 'melee' ? 'Éviter de rejouer avec ou contre les mêmes joueurs' : 'Éviter que deux équipes se rencontrent deux fois'}
      </label>
    </div>
    <label class="champ">
      <span>Numéro de la première table</span>
      <input type="number" min="1" bind:value={reglages.premiereTable} />
    </label>
  </div>
</section>

<section class="carte">
  <h2>{reglages.mode === 'melee' ? 'Joueurs exempts' : 'Équipe exempte'}</h2>
  <p class="discret">
    {reglages.mode === 'melee'
      ? "Quand le nombre de joueurs n'est pas un multiple de 4, 1 à 3 joueurs ne jouent pas la partie."
      : "Avec un nombre impair d'équipes, une équipe ne joue pas la partie."}
    C'est le moins bien classé qui n'a pas encore été exempt.
  </p>
  <div class="grille-champs">
    <div class="champ">
      <span>Points accordés</span>
      <label><input type="radio" bind:group={reglages.exemptPoints} value="moyenne" /> Moyenne des points de la partie</label>
      <label><input type="radio" bind:group={reglages.exemptPoints} value="fixe" /> Nombre fixe</label>
      {#if reglages.exemptPoints === 'fixe'}
        <input type="number" min="0" bind:value={reglages.exemptPointsFixes} />
      {/if}
    </div>
    <div class="champ">
      <span>Victoire</span>
      <label><input type="checkbox" bind:checked={reglages.exemptVictoire} /> Compter la partie comme gagnée</label>
    </div>
  </div>
</section>

<section class="carte">
  <h2>Lots <span class="discret">(facultatif)</span></h2>
  <label class="champ">
    <span>Un lot par ligne : 1re ligne pour le 1er, 2e ligne pour le 2e…</span>
    <textarea rows="5" bind:value={lotsTexte} placeholder={'Jambon\nPanier garni\nBouteilles de vin'}></textarea>
  </label>
</section>

<style>
  .criteres {
    margin: 0;
    padding-left: 1.4em;
    display: flex;
    flex-direction: column;
    gap: 0.3em;
  }
  .criteres li {
    display: flex;
    align-items: center;
    gap: 0.3em;
  }
  textarea {
    width: 100%;
    max-width: 480px;
  }
  .grille-champs > .champ label {
    font-weight: normal;
  }
</style>
