<script lang="ts" module>
  export interface Suggestion {
    cle: string;
    titre: string;
    detail?: string;
    badge?: string;
  }
</script>

<script lang="ts">
  let {
    value = $bindable(),
    champ = $bindable(),
    suggestions,
    onchoisir,
    onentree,
    placeholder = '',
    id,
  }: {
    value: string;
    champ?: HTMLInputElement;
    suggestions: Suggestion[];
    onchoisir: (s: Suggestion) => void;
    /** Entrée sans suggestion sélectionnée ; appeler e.preventDefault() pour ne pas valider le formulaire. */
    onentree?: (e: KeyboardEvent) => void;
    placeholder?: string;
    id?: string;
  } = $props();

  const idListe = `suggestions-${Math.random().toString(36).slice(2, 8)}`;
  let ouvert = $state(false);
  let actif = $state(-1);
  const visible = $derived(ouvert && suggestions.length > 0);

  function choisir(s: Suggestion) {
    ouvert = false;
    actif = -1;
    onchoisir(s);
  }

  function saisie() {
    ouvert = true;
    // On présélectionne la première suggestion dès que le début du nom est tapé.
    actif = value.trim().length >= 3 ? 0 : -1;
  }

  function touche(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!suggestions.length) return;
      e.preventDefault();
      ouvert = true;
      const n = suggestions.length;
      actif = e.key === 'ArrowDown' ? (actif + 1) % n : (actif - 1 + n) % n;
    } else if (e.key === 'Enter') {
      if (visible && actif >= 0 && suggestions[actif]) {
        e.preventDefault();
        choisir(suggestions[actif]);
      } else {
        ouvert = false;
        onentree?.(e);
      }
    } else if (e.key === 'Escape' && visible) {
      e.preventDefault();
      ouvert = false;
      actif = -1;
    }
  }

  $effect(() => {
    // Si la liste change (frappe), la sélection ne doit pas déborder.
    if (actif >= suggestions.length) actif = suggestions.length ? 0 : -1;
  });
</script>

<div class="conteneur">
  <input
    {id}
    bind:this={champ}
    bind:value
    {placeholder}
    autocomplete="off"
    spellcheck="false"
    role="combobox"
    aria-expanded={visible}
    aria-controls={idListe}
    aria-autocomplete="list"
    oninput={saisie}
    onkeydown={touche}
    onfocus={() => (ouvert = value.trim().length > 0)}
    onblur={() => (ouvert = false)} />
  {#if visible}
    <ul class="liste" role="listbox" id={idListe}>
      {#each suggestions as s, i (s.cle)}
        <li
          role="option"
          aria-selected={i === actif}
          class:actif={i === actif}
          onmousedown={(e) => {
            e.preventDefault();
            choisir(s);
          }}
          onmouseenter={() => (actif = i)}>
          <span class="titre">{s.titre}</span>
          {#if s.badge}<span class="pastille ok">{s.badge}</span>{/if}
          {#if s.detail}<span class="detail">{s.detail}</span>{/if}
        </li>
      {/each}
      <li class="aide" aria-hidden="true">↑ ↓ pour choisir · Entrée pour valider · Échap pour ignorer</li>
    </ul>
  {/if}
</div>

<style>
  .conteneur {
    position: relative;
    align-self: stretch;
  }
  input {
    width: 100%;
  }
  .liste {
    position: absolute;
    z-index: 10;
    top: calc(100% + 2px);
    left: 0;
    right: 0;
    margin: 0;
    padding: 0.25rem 0;
    list-style: none;
    background: var(--surface);
    border: 1px solid var(--bord);
    border-radius: var(--rayon);
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.12);
    max-height: 22rem;
    overflow-y: auto;
  }
  li {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.2rem 0.5rem;
    padding: 0.45rem 0.75rem;
    cursor: pointer;
  }
  li.actif {
    background: var(--accent-clair);
  }
  .titre {
    font-weight: 600;
  }
  .detail {
    width: 100%;
    font-size: 0.85rem;
    color: var(--texte-2);
  }
  li.aide {
    cursor: default;
    font-size: 0.78rem;
    color: var(--texte-2);
    border-top: 1px solid var(--bord);
    margin-top: 0.25rem;
  }
</style>
