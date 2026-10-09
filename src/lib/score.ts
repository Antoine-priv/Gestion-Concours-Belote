import { BELOTE, CAPOT, POINTS_DONNE, TOTAL_PARTIE } from './reglages';
import type { Resultat, ScoreCamp } from './types';

export interface Verification {
  ok: boolean;
  total: number;
  attendu: number;
  message: string;
}

function pluriel(n: number, mot: string): string {
  return `${n} ${mot}${n > 1 ? 's' : ''}`;
}

/** Piste d'explication d'un écart (attendu − total). */
function piste(ecart: number): string {
  const bonusCapot = CAPOT - POINTS_DONNE;
  const n = Math.abs(ecart);
  if (ecart < 0) {
    // Total trop élevé : un bonus a sans doute été compté dans les points sans être noté à part.
    if (n % bonusCapot === 0) return ` ${pluriel(n / bonusCapot, 'capot')} oublié(s) dans la case « Capots » ?`;
    if (n % BELOTE === 0) return ` ${pluriel(n / BELOTE, 'belote')} oubliée(s) dans la case « Belotes » ?`;
  } else {
    if (n % bonusCapot === 0) return ` ${pluriel(n / bonusCapot, 'capot')} noté(s) en trop ?`;
    if (n % BELOTE === 0) return ` ${pluriel(n / BELOTE, 'belote')} notée(s) en trop ?`;
  }
  return '';
}

/**
 * Vérifie que les points des deux équipes d'une table concordent :
 * total = 12 × 162 + 20 par belote + 90 par capot.
 */
export function verifier(res: Resultat): Verification {
  const champs = [res.a, res.b].flatMap((c) => [c.points, c.belotes, c.capots]);
  const total = res.a.points + res.b.points;
  const belotes = res.a.belotes + res.b.belotes;
  const capots = res.a.capots + res.b.capots;
  const attendu = TOTAL_PARTIE + belotes * BELOTE + capots * (CAPOT - POINTS_DONNE);
  if (champs.some((v) => !Number.isInteger(v) || v < 0)) {
    return { ok: false, total, attendu, message: 'Les valeurs doivent être des nombres entiers positifs.' };
  }
  const ecart = attendu - total;
  if (ecart === 0) return { ok: true, total, attendu, message: 'Les points concordent.' };
  return {
    ok: false,
    total,
    attendu,
    message: `Le total fait ${total} au lieu de ${attendu} (écart de ${Math.abs(ecart)}).` + piste(ecart),
  };
}

export type Issue = 'a' | 'b' | 'nul';

export function issue(res: Resultat): Issue {
  if (res.a.points > res.b.points) return 'a';
  if (res.b.points > res.a.points) return 'b';
  return 'nul';
}

export function scoreVide(): ScoreCamp {
  return { points: 0, belotes: 0, capots: 0 };
}
