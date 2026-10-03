import { tick } from 'svelte';
import type { Id } from './types';

function lire() {
  return location.hash.replace(/^#/, '') || '/';
}

export const route = $state({ chemin: lire() });

window.addEventListener('hashchange', () => {
  route.chemin = lire();
  window.scrollTo(0, 0);
});

export function aller(chemin: string) {
  location.hash = chemin;
}

export type VueImpression =
  | { type: 'feuilles'; concours: Id; partie: number }
  | { type: 'tirage'; concours: Id; partie: number }
  | { type: 'classement'; concours: Id; jusqua?: number }
  | { type: 'inscrits'; concours: Id };

export const impression = $state<{ vue: VueImpression | null }>({ vue: null });

export async function imprimer(vue: VueImpression) {
  impression.vue = vue;
  await tick();
  window.print();
}

window.addEventListener('afterprint', () => (impression.vue = null));
