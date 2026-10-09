<script lang="ts">
  import { CRITERES, MOITIE_PARTIE, NB_DONNES, NB_PARTIES, TOTAL_PARTIE, TOUS_CRITERES } from '../lib/reglages';
  import type { Critere, Reglages } from '../lib/types';

  let { reglages = $bindable() }: { reglages: Reglages } = $props();

  const disponibles = $derived(TOUS_CRITERES.filter((k) => !reglages.departage.includes(k)));

  function deplacer(k: Critere, sens: -1 | 1) {
    const l = [...reglages.departage];
    const i = l.indexOf(k);
    const j = i + sens;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    reglages.departage = l;
  }
</script>

<section class="carte">
  <h2>Règles fixes</h2>
  <p class="discret">
    {NB_PARTIES} parties de {NB_DONNES} donnes · capot à 252 · belote à 20 · pas d'annonces · tirage au sort pour la
    1re partie, puis selon le classement · classement au total des points.
  </p>
  <p class="discret">
    Une partie supplémentaire peut être ajoutée, ou le concours terminé plus tôt, depuis l'onglet de la dernière partie.
  </p>
</section>

<section class="carte">
  <h2>En cas d'égalité de points</h2>
  <p class="discret">Les critères sont appliqués dans l'ordre, jusqu'à départager les équipes.</p>
  <ol class="criteres">
    {#each reglages.departage as k, i (k)}
      <li>
        <div class="texte">
          <strong>{CRITERES[k].libelle}</strong>
          <small>{CRITERES[k].explication}</small>
        </div>
        <button class="petit" type="button" disabled={i === 0} onclick={() => deplacer(k, -1)} aria-label="Monter">↑</button>
        <button class="petit" type="button" disabled={i === reglages.departage.length - 1} onclick={() => deplacer(k, 1)} aria-label="Descendre">↓</button>
        <button
          class="petit danger"
          type="button"
          onclick={() => (reglages.departage = reglages.departage.filter((x) => x !== k))}
          aria-label="Retirer">✕</button>
      </li>
    {/each}
  </ol>
  {#if reglages.departage.length === 0}
    <p class="alerte attention">Aucun critère : les équipes à égalité de points resteront ex æquo.</p>
  {/if}
  {#if disponibles.length}
    <details>
      <summary>Ajouter un critère</summary>
      <ul class="disponibles">
        {#each disponibles as k (k)}
          <li>
            <button class="petit" type="button" onclick={() => (reglages.departage = [...reglages.departage, k])}>+ Ajouter</button>
            <div class="texte">
              <strong>{CRITERES[k].libelle}</strong>
              <small>{CRITERES[k].explication}</small>
            </div>
          </li>
        {/each}
      </ul>
    </details>
  {/if}
</section>

<section class="carte">
  <h2>Tirage des tables</h2>
  <label>
    <input type="checkbox" bind:checked={reglages.eviterRevanche} />
    Éviter que deux équipes se rencontrent deux fois
  </label>
</section>

<section class="carte">
  <h2>Équipe exempte</h2>
  <p class="discret">
    Avec un nombre impair d'équipes, une équipe ne joue pas la partie : la moins bien classée qui n'a pas encore été
    exempte. Si une équipe finit tôt, elle peut jouer contre l'exempte, qui garde alors son vrai score.
  </p>
  <div class="grille-champs">
    <div class="champ">
      <span>Points accordés à l'exempte</span>
      <label>
        <input type="radio" bind:group={reglages.exemptPoints} value="moitie" />
        La moitié d'une partie : {MOITIE_PARTIE} points ({TOTAL_PARTIE} ÷ 2)
      </label>
      <label>
        <input type="radio" bind:group={reglages.exemptPoints} value="moyenne" />
        La moyenne des points de toutes les équipes de la partie
      </label>
      <small>La moyenne vaut environ {MOITIE_PARTIE}, plus une part des belotes et capots de la partie.</small>
    </div>
    <div class="champ">
      <span>Statistiques</span>
      <label><input type="checkbox" bind:checked={reglages.exemptVictoire} /> Compter la partie comme gagnée</label>
      <small>Sans effet sur le classement, qui se fait aux points.</small>
    </div>
  </div>
</section>

<style>
  .criteres,
  .disponibles {
    margin: 0 0 0.5rem;
    padding-left: 1.4em;
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }
  .disponibles {
    list-style: none;
    padding-left: 0;
    margin-top: 0.6rem;
  }
  .criteres li,
  .disponibles li {
    display: flex;
    align-items: center;
    gap: 0.5em;
  }
  .texte {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .texte small {
    color: var(--texte-2);
  }
  summary {
    cursor: pointer;
    color: var(--accent);
    font-weight: 600;
  }
  .grille-champs > .champ label {
    font-weight: normal;
  }
</style>
