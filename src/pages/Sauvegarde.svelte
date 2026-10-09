<script lang="ts">
  import { confirmer } from '../lib/dialogue.svelte';
  import { aujourdhui } from '../lib/format';
  import { fichierAutoDisponible, lireFichier, telecharger } from '../lib/stockage';
  import {
    activerFichierAuto,
    app,
    desactiverFichierAuto,
    reautoriserFichier,
    remplacerDonnees,
    sauvegarde,
  } from '../lib/store.svelte';

  let message = $state('');
  let erreur = $state('');
  let entree: HTMLInputElement;

  async function activer() {
    erreur = '';
    try {
      await activerFichierAuto();
      message = 'Sauvegarde automatique activée.';
    } catch (e) {
      if ((e as Error).name !== 'AbortError') erreur = (e as Error).message;
    }
  }

  function exporter() {
    telecharger(`belote-sauvegarde-${aujourdhui()}.json`, JSON.stringify(app.donnees, null, 1), 'application/json');
  }

  async function importer(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    entree.value = '';
    if (!f) return;
    erreur = '';
    message = '';
    try {
      const d = await lireFichier(f);
      const resume = `${d.concours.length} concours, ${d.joueurs.length} joueurs`;
      const ok = await confirmer('Remplacer toutes les données actuelles ?', {
        message: `Le fichier contient ${resume}. Les données actuelles seront remplacées.\nConseil : téléchargez d'abord une copie de sauvegarde.`,
        valider: 'Remplacer',
        danger: true,
      });
      if (!ok) return;
      remplacerDonnees(d);
      message = `Données restaurées : ${resume}.`;
    } catch (err) {
      erreur = (err as Error).message;
    }
  }
</script>

<h1>Sauvegarde</h1>

{#if message}<div class="alerte info">{message}</div>{/if}
{#if erreur}<div class="alerte erreur">{erreur}</div>{/if}

<section class="carte">
  <h2>Où sont mes données ?</h2>
  <p>
    Tout est enregistré <strong>automatiquement dans le navigateur</strong> de cet ordinateur, à chaque modification.
    Il n'y a rien à faire pour sauvegarder.
  </p>
  <p class="discret">
    Attention : si l'on efface les données de navigation de Chrome, ou si l'ordinateur tombe en panne, elles seraient perdues.
    D'où les deux protections ci-dessous.
  </p>
  <p class="discret">
    Actuellement : {app.donnees.concours.length} concours, {app.donnees.joueurs.length} joueurs, {app.donnees.equipes.length} équipes.
  </p>
</section>

<section class="carte">
  <h2>1. Copie automatique dans un fichier <span class="pastille ok">recommandé</span></h2>
  {#if !fichierAutoDisponible}
    <p class="alerte attention">Ce navigateur ne le permet pas. Utilisez Google Chrome ou Microsoft Edge.</p>
  {:else if sauvegarde.fichier}
    <p>
      Chaque modification est aussi écrite dans le fichier <strong>{sauvegarde.fichier}</strong>.
      {#if sauvegarde.derniere}<span class="discret">Dernière écriture : {sauvegarde.derniere.toLocaleTimeString('fr-FR')}.</span>{/if}
    </p>
    {#if sauvegarde.aReautoriser}
      <div class="alerte attention">
        Chrome demande votre accord pour continuer à écrire dans ce fichier (à faire une fois à chaque ouverture).
        <br /><button class="principal" onclick={reautoriserFichier}>Autoriser</button>
      </div>
    {/if}
    {#if sauvegarde.erreur}<div class="alerte erreur">{sauvegarde.erreur}</div>{/if}
    <div class="ligne">
      <button onclick={activer}>Choisir un autre fichier</button>
      <button class="danger" onclick={desactiverFichierAuto}>Arrêter la copie automatique</button>
    </div>
  {:else}
    <p>
      Choisissez un fichier, par exemple dans « Documents » ou sur une clé USB. L'application y recopiera
      toutes les données après chaque modification.
    </p>
    <button class="principal" onclick={activer}>Choisir le fichier de sauvegarde</button>
  {/if}
</section>

<section class="carte">
  <h2>2. Copie manuelle</h2>
  <p>Téléchargez une copie à garder (sur une clé USB, par email…). Utile aussi pour passer à un autre ordinateur.</p>
  <div class="ligne">
    <button onclick={exporter}>Télécharger une copie</button>
    <button onclick={() => entree.click()}>Restaurer depuis un fichier…</button>
    <input bind:this={entree} type="file" accept=".json,application/json" onchange={importer} hidden />
  </div>
  <p class="discret">La restauration remplace toutes les données actuelles par celles du fichier.</p>
</section>
