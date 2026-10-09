<script lang="ts">
  import { onMount } from 'svelte';
  import type { Demande } from '../lib/dialogue.svelte';

  let { demande }: { demande: Demande } = $props();

  let boite: HTMLDialogElement;
  let boutonValider: HTMLButtonElement;
  let boutonAnnuler: HTMLButtonElement | undefined = $state();
  let repondu = false;

  function repondre(ok: boolean) {
    if (repondu) return;
    repondu = true;
    demande.repondre(ok);
  }

  onMount(() => {
    boite.showModal();
    // Pour une action destructive, Entrée ne doit pas valider par mégarde.
    (demande.danger && boutonAnnuler ? boutonAnnuler : boutonValider).focus();
    return () => repondre(false);
  });
</script>

<dialog
  bind:this={boite}
  aria-labelledby="dialogue-titre"
  oncancel={(e) => {
    e.preventDefault();
    repondre(false);
  }}>
  <h2 id="dialogue-titre">{demande.titre}</h2>
  {#if demande.message}
    <p class="message">{demande.message}</p>
  {/if}
  <div class="ligne fin">
    {#if demande.annuler}
      <button bind:this={boutonAnnuler} onclick={() => repondre(false)}>{demande.annuler}</button>
    {/if}
    <button bind:this={boutonValider} class="principal" class:rouge={demande.danger} onclick={() => repondre(true)}>
      {demande.valider}
    </button>
  </div>
</dialog>

<style>
  dialog {
    border: none;
    border-radius: 12px;
    padding: 1.4rem 1.6rem;
    width: min(480px, 92vw);
    box-shadow: 0 10px 40px rgb(0 0 0 / 0.25);
  }
  dialog::backdrop {
    background: rgb(20 30 25 / 0.45);
  }
  h2 {
    font-size: 1.15rem;
  }
  .message {
    white-space: pre-line;
    color: var(--texte-2);
    margin-bottom: 1.2rem;
  }
  button.principal.rouge {
    background: var(--rouge);
    border-color: var(--rouge);
  }
  button.principal.rouge:hover {
    background: #8f1d17;
  }
</style>
