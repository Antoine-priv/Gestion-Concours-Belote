<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Partie } from '../lib/types';

  let {
    partie,
    dureeMinutes,
    lectureSeule = false,
    grand = false,
  }: { partie: Partie; dureeMinutes: number; lectureSeule?: boolean; grand?: boolean } = $props();

  let maintenant = $state(Date.now());
  const minuterie = setInterval(() => (maintenant = Date.now()), 250);
  onDestroy(() => clearInterval(minuterie));

  const ch = $derived(partie.chrono);
  const restant = $derived(
    !ch ? dureeMinutes * 60_000 : ch.debut != null ? ch.dureeMs - (maintenant - ch.debut) : (ch.restantPause ?? ch.dureeMs),
  );
  const enMarche = $derived(ch?.debut != null);
  const fini = $derived(!!ch && restant <= 0);

  function texte(ms: number) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const p = (n: number) => String(n).padStart(2, '0');
    return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
  }

  let sonne = false;
  $effect(() => {
    if (fini && enMarche && !sonne && !lectureSeule) {
      sonne = true;
      sonnerie();
    }
    if (!fini) sonne = false;
  });

  function sonnerie() {
    try {
      const ctx = new AudioContext();
      [0, 0.45, 0.9].forEach((t) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.3, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.4);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + 0.4);
      });
    } catch {
      /* pas de son disponible */
    }
  }

  function demarrer() {
    partie.chrono = { debut: Date.now(), dureeMs: dureeMinutes * 60_000 };
  }
  function pause() {
    if (!ch || ch.debut == null) return;
    partie.chrono = { dureeMs: ch.dureeMs, restantPause: restant };
  }
  function reprendre() {
    if (!ch) return;
    const r = ch.restantPause ?? ch.dureeMs;
    partie.chrono = { dureeMs: ch.dureeMs, debut: Date.now() - (ch.dureeMs - r) };
  }
  function ajuster(minutes: number) {
    if (!ch) return;
    const dureeMs = Math.max(60_000, ch.dureeMs + minutes * 60_000);
    partie.chrono = ch.debut != null ? { dureeMs, debut: ch.debut } : { dureeMs, restantPause: (ch.restantPause ?? ch.dureeMs) + (dureeMs - ch.dureeMs) };
  }
  function arreter() {
    if (confirm('Remettre le chronomètre à zéro ?')) partie.chrono = undefined;
  }
</script>

{#if lectureSeule}
  {#if ch}
    <div class="affichage" class:grand class:fini>
      {fini ? 'Temps écoulé !' : texte(restant)}
      {#if !enMarche && !fini}<small>(en pause)</small>{/if}
    </div>
  {/if}
{:else}
  <div class="chrono carte" class:fini>
    <span class="affichage">{fini ? 'Temps écoulé !' : texte(restant)}</span>
    <div class="ligne">
      {#if !ch}
        <button class="principal" onclick={demarrer}>▶ Démarrer le chrono</button>
      {:else}
        {#if enMarche}
          <button onclick={pause}>⏸ Pause</button>
        {:else}
          <button class="principal" onclick={reprendre}>▶ Reprendre</button>
        {/if}
        <button class="petit" onclick={() => ajuster(-1)} title="Retirer une minute">−1 min</button>
        <button class="petit" onclick={() => ajuster(1)} title="Ajouter une minute">+1 min</button>
        <button class="petit" onclick={() => ajuster(5)} title="Ajouter 5 minutes">+5 min</button>
        <button class="petit danger" onclick={arreter}>Remise à zéro</button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .chrono {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    flex-wrap: wrap;
    padding: 0.7rem 1.1rem;
  }
  .affichage {
    font-size: 2rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    min-width: 5ch;
  }
  .affichage.grand {
    font-size: clamp(3rem, 9vw, 7rem);
    text-align: center;
  }
  .affichage small {
    font-size: 0.35em;
    font-weight: 400;
    margin-left: 0.4em;
  }
  .fini {
    color: var(--rouge);
  }
  .chrono.fini {
    background: var(--rouge-clair);
    border-color: #e6b8b4;
  }
</style>
