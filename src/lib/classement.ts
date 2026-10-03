import { issue } from './score';
import type { Concours, Critere, Id, Partie } from './types';

export interface Ligne {
  id: Id;
  numero: number;
  rang: number;
  joues: number;
  victoires: number;
  nuls: number;
  defaites: number;
  exempts: number;
  /** Points reçus en étant exempt (exclus de la différence). */
  pointsExempt: number;
  /** Victoires + ½ par match nul, utilisé pour classer. */
  score: number;
  points: number;
  contre: number;
  difference: number;
  meilleure: number;
  belotes: number;
  capots: number;
  abandon: boolean;
  adversaires: Id[];
  partenaires: Id[];
}

function ligneVide(id: Id, numero: number, abandon: boolean): Ligne {
  return {
    id,
    numero,
    rang: 0,
    joues: 0,
    victoires: 0,
    nuls: 0,
    defaites: 0,
    exempts: 0,
    pointsExempt: 0,
    score: 0,
    points: 0,
    contre: 0,
    difference: 0,
    meilleure: 0,
    belotes: 0,
    capots: 0,
    abandon,
    adversaires: [],
    partenaires: [],
  };
}

/** Points attribués à un exempt pour une partie. */
export function pointsExempt(c: Concours, p: Partie): number {
  const r = c.reglages;
  if (r.exemptPoints === 'fixe') return r.exemptPointsFixes;
  const scores = p.tables.flatMap((t) => (t.resultat ? [t.resultat.a.points, t.resultat.b.points] : []));
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((s, x) => s + x, 0) / scores.length);
}

/** Hachage stable pour départager « au sort » sans changer d'avis à chaque calcul. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Points marqués par a contre b dans leurs confrontations directes, moins ceux de b. */
function confrontation(c: Concours, a: Id, b: Id, jusqua: number): number {
  let solde = 0;
  for (const p of c.parties) {
    if (p.numero > jusqua) continue;
    for (const t of p.tables) {
      if (!t.resultat) continue;
      const ia = t.a.includes(a) ? 'a' : t.b.includes(a) ? 'b' : null;
      const ib = t.a.includes(b) ? 'a' : t.b.includes(b) ? 'b' : null;
      if (!ia || !ib || ia === ib) continue;
      const iss = issue(t.resultat);
      if (iss === ia) solde += 1;
      else if (iss === ib) solde -= 1;
    }
  }
  return solde;
}

/**
 * Classement après les parties 1 à `jusqua` (toutes par défaut).
 * Seules les tables dont le résultat est saisi comptent.
 */
export function calculerClassement(c: Concours, jusqua = Infinity): Ligne[] {
  const lignes = new Map<Id, Ligne>();
  for (const p of c.participants) {
    lignes.set(p.id, ligneVide(p.id, p.numero, p.abandonPartie != null));
  }

  for (const partie of c.parties) {
    if (partie.numero > jusqua) continue;
    for (const t of partie.tables) {
      for (const camp of [t.a, t.b]) {
        for (const id of camp) {
          const l = lignes.get(id);
          if (!l) continue;
          const adv = camp === t.a ? t.b : t.a;
          l.adversaires.push(...adv);
          l.partenaires.push(...camp.filter((x) => x !== id));
        }
      }
      const res = t.resultat;
      if (!res) continue;
      const iss = issue(res);
      for (const cote of ['a', 'b'] as const) {
        const moi = res[cote];
        const eux = res[cote === 'a' ? 'b' : 'a'];
        for (const id of t[cote]) {
          const l = lignes.get(id);
          if (!l) continue;
          l.joues++;
          if (iss === 'nul') l.nuls++;
          else if (iss === cote) l.victoires++;
          else l.defaites++;
          l.points += moi.points;
          l.contre += eux.points;
          l.meilleure = Math.max(l.meilleure, moi.points);
          l.belotes += moi.belotes;
          l.capots += moi.capots;
        }
      }
    }
    if (partie.exempts.length) {
      const pts = pointsExempt(c, partie);
      for (const id of partie.exempts) {
        const l = lignes.get(id);
        if (!l) continue;
        l.exempts++;
        l.points += pts;
        l.pointsExempt += pts;
        if (c.reglages.exemptVictoire) l.victoires++;
      }
    }
  }

  for (const l of lignes.values()) {
    l.score = l.victoires + l.nuls / 2;
    l.difference = l.points - l.pointsExempt - l.contre;
  }

  const r = c.reglages;
  const principal: Critere = r.classement === 'victoires' ? 'victoires' : 'points';
  const criteres = [principal, ...r.departage.filter((k) => k !== principal)];
  const fin = Number.isFinite(jusqua) ? jusqua : c.parties.length;

  const comparer = (x: Ligne, y: Ligne): number => {
    for (const k of criteres) {
      let d = 0;
      switch (k) {
        case 'victoires': d = y.score - x.score; break;
        case 'points': d = y.points - x.points; break;
        case 'difference': d = y.difference - x.difference; break;
        case 'meilleurePartie': d = y.meilleure - x.meilleure; break;
        case 'pointsContre': d = x.contre - y.contre; break;
        case 'confrontation': d = -confrontation(c, x.id, y.id, fin); break;
        case 'tirage': d = hash(c.id + x.id) - hash(c.id + y.id); break;
      }
      if (d !== 0) return d;
    }
    return 0;
  };

  const liste = [...lignes.values()].sort((x, y) => comparer(x, y) || x.numero - y.numero);
  liste.forEach((l, i) => {
    l.rang = i > 0 && comparer(liste[i - 1], l) === 0 ? liste[i - 1].rang : i + 1;
  });
  return liste;
}
