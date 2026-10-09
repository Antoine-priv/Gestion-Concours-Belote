import { MOITIE_PARTIE } from './reglages';
import { issue } from './score';
import type { Concours, Critere, Id, Partie, Resultat, ScoreCamp } from './types';

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
  points: number;
  contre: number;
  difference: number;
  meilleure: number;
  belotes: number;
  capots: number;
  abandon: boolean;
  /** Adversaires rencontrés (hors matchs de rattrapage), pour éviter les revanches. */
  adversaires: Id[];
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
    points: 0,
    contre: 0,
    difference: 0,
    meilleure: 0,
    belotes: 0,
    capots: 0,
    abandon,
    adversaires: [],
  };
}

export interface ScoreCompte {
  id: Id;
  moi: ScoreCamp;
  eux: ScoreCamp;
  gagne: boolean;
  nul: boolean;
}

/**
 * Scores qui comptent dans une partie : les deux camps de chaque table saisie, plus
 * l'exempt s'il a joué un rattrapage (son adversaire, lui, joue pour du beurre).
 */
export function scoresComptes(p: Partie): ScoreCompte[] {
  const r: ScoreCompte[] = [];
  const ajouter = (res: Resultat, a: Id, b?: Id) => {
    const iss = issue(res);
    r.push({ id: a, moi: res.a, eux: res.b, gagne: iss === 'a', nul: iss === 'nul' });
    if (b) r.push({ id: b, moi: res.b, eux: res.a, gagne: iss === 'b', nul: iss === 'nul' });
  };
  for (const t of p.tables) if (t.resultat) ajouter(t.resultat, t.a, t.b);
  if (p.exempt && p.rattrapage?.resultat) ajouter(p.rattrapage.resultat, p.exempt);
  return r;
}

/** Points attribués d'office à l'exempt (quand il n'a pas joué de rattrapage). */
export function pointsExempt(c: Concours, p: Partie): number {
  if (c.reglages.exemptPoints === 'moitie') return MOITIE_PARTIE;
  const scores = p.tables.flatMap((t) => (t.resultat ? [t.resultat.a.points, t.resultat.b.points] : []));
  if (scores.length === 0) return MOITIE_PARTIE;
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

/** +1 par confrontation directe gagnée par a contre b, −1 par défaite. */
function confrontation(c: Concours, a: Id, b: Id, jusqua: number): number {
  let solde = 0;
  for (const p of c.parties) {
    if (p.numero > jusqua) continue;
    for (const t of p.tables) {
      if (!t.resultat) continue;
      const ca = t.a === a ? 'a' : t.b === a ? 'b' : null;
      const cb = t.a === b ? 'a' : t.b === b ? 'b' : null;
      if (!ca || !cb) continue;
      const iss = issue(t.resultat);
      if (iss === ca) solde += 1;
      else if (iss === cb) solde -= 1;
    }
  }
  return solde;
}

/**
 * Classement après les parties 1 à `jusqua` (toutes par défaut) : total des points,
 * puis les critères de départage. Seules les tables dont le résultat est saisi comptent.
 */
export function calculerClassement(c: Concours, jusqua = Infinity): Ligne[] {
  const lignes = new Map<Id, Ligne>();
  for (const p of c.participants) {
    lignes.set(p.id, ligneVide(p.id, p.numero, p.abandonPartie != null));
  }

  const compter = ({ id, moi, eux, gagne, nul }: ScoreCompte) => {
    const l = lignes.get(id);
    if (!l) return;
    l.joues++;
    if (nul) l.nuls++;
    else if (gagne) l.victoires++;
    else l.defaites++;
    l.points += moi.points;
    l.contre += eux.points;
    l.meilleure = Math.max(l.meilleure, moi.points);
    l.belotes += moi.belotes;
    l.capots += moi.capots;
  };

  for (const partie of c.parties) {
    if (partie.numero > jusqua) continue;
    for (const t of partie.tables) {
      lignes.get(t.a)?.adversaires.push(t.b);
      lignes.get(t.b)?.adversaires.push(t.a);
    }
    scoresComptes(partie).forEach(compter);
    const ex = partie.exempt ? lignes.get(partie.exempt) : undefined;
    // Sans rattrapage joué, l'exempt reçoit des points d'office.
    if (ex && !partie.rattrapage?.resultat) {
      const pts = pointsExempt(c, partie);
      ex.exempts++;
      ex.points += pts;
      ex.pointsExempt += pts;
      if (c.reglages.exemptVictoire) ex.victoires++;
    }
  }

  for (const l of lignes.values()) l.difference = l.points - l.pointsExempt - l.contre;

  const fin = Number.isFinite(jusqua) ? jusqua : c.parties.length;
  const comparer = (x: Ligne, y: Ligne): number => {
    if (y.points !== x.points) return y.points - x.points;
    for (const k of c.reglages.departage) {
      let d = 0;
      switch (k as Critere) {
        case 'victoires': d = y.victoires + y.nuls / 2 - (x.victoires + x.nuls / 2); break;
        case 'meilleurePartie': d = y.meilleure - x.meilleure; break;
        case 'confrontation': d = -confrontation(c, x.id, y.id, fin); break;
        case 'difference': d = y.difference - x.difference; break;
        case 'pointsContre': d = x.contre - y.contre; break;
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
