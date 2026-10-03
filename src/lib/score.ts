import type { Reglages, Resultat } from './types';

export interface Unites {
  donne: number;
  belote: number;
  capot: number;
}

/** Valeurs d'une donne, d'une belote et d'un capot, selon le comptage choisi. */
export function unites(r: Reglages): Unites {
  if (r.pointsArrondis) return { donne: 16, belote: 2, capot: 25 };
  return { donne: 162, belote: 20, capot: r.capot };
}

export interface Verification {
  ok: boolean;
  total: number;
  /** Total attendu, quand le nombre de donnes est connu. */
  attendu?: number;
  /** Nombre de donnes retrouvé à partir des points (parties au temps ou au score). */
  donnesDeduites?: number;
  message: string;
}

/** Nombre de donnes connu : fixé par les réglages, ou saisi pour cette table. */
export function donnesConnues(res: Resultat, r: Reglages): number | undefined {
  if (res.donnes != null && res.donnes > 0) return res.donnes;
  if (r.finPartie === 'donnes') return r.nbDonnes;
  return undefined;
}

function bonus(res: Resultat, r: Reglages): number {
  const u = unites(r);
  const belotes = res.a.belotes + res.b.belotes;
  const capots = res.a.capots + res.b.capots;
  const annonces = r.annonces ? res.a.annonces + res.b.annonces : 0;
  return belotes * u.belote + capots * (u.capot - u.donne) + annonces;
}

function pluriel(n: number, mot: string): string {
  return `${n} ${mot}${Math.abs(n) > 1 ? 's' : ''}`;
}

/** Piste d'explication d'un écart (attendu − total). */
function piste(ecart: number, r: Reglages): string {
  const u = unites(r);
  const bonusCapot = u.capot - u.donne;
  const n = Math.abs(ecart);
  if (ecart < 0) {
    // Total trop élevé : un bonus a sans doute été compté dans les points sans être noté à part.
    if (n % bonusCapot === 0) return ` ${pluriel(n / bonusCapot, 'capot')} oublié(s) dans la case « Capots » ?`;
    if (n % u.belote === 0) return ` ${pluriel(n / u.belote, 'belote')} oubliée(s) dans la case « Belotes » ?`;
  } else {
    if (n % bonusCapot === 0) return ` ${pluriel(n / bonusCapot, 'capot')} noté(s) en trop ?`;
    if (n % u.belote === 0) return ` ${pluriel(n / u.belote, 'belote')} notée(s) en trop ?`;
  }
  return '';
}

/** Vérifie que les points des deux équipes d'une table concordent. */
export function verifier(res: Resultat, r: Reglages): Verification {
  const champs = [res.a, res.b].flatMap((c) => [c.points, c.belotes, c.capots, c.annonces]);
  const total = res.a.points + res.b.points;
  if (champs.some((v) => !Number.isInteger(v) || v < 0)) {
    return { ok: false, total, message: 'Les valeurs doivent être des nombres entiers positifs.' };
  }
  if (r.controle === 'aucun') return { ok: true, total, message: '' };

  const u = unites(r);
  const extra = bonus(res, r);
  const n = donnesConnues(res, r);

  if (r.controle === 'dernierChiffre') {
    if (n == null) {
      return { ok: false, total, message: 'Indiquez le nombre de donnes jouées pour vérifier les points.' };
    }
    const attendu = n * u.donne + extra;
    const chiffre = attendu % 10;
    const ok = total % 10 === chiffre;
    return {
      ok,
      total,
      attendu,
      message: ok ? 'Les points concordent.' : `Le total (${total}) devrait finir par ${chiffre}.`,
    };
  }

  if (n != null) {
    const attendu = n * u.donne + extra;
    const ecart = attendu - total;
    if (ecart === 0) return { ok: true, total, attendu, message: 'Les points concordent.' };
    return {
      ok: false,
      total,
      attendu,
      message: `Le total fait ${total} au lieu de ${attendu} (écart de ${Math.abs(ecart)}).` + piste(ecart, r),
    };
  }

  const base = total - extra;
  if (base > 0 && base % u.donne === 0) {
    const d = base / u.donne;
    return { ok: true, total, donnesDeduites: d, message: `Les points concordent (${pluriel(d, 'donne')}).` };
  }
  const reste = ((base % u.donne) + u.donne) % u.donne;
  return {
    ok: false,
    total,
    message:
      `Le total (${total}) ne correspond à aucun nombre de donnes entier ` +
      `(reste ${reste} sur ${u.donne}). Vérifiez les points, belotes et capots.`,
  };
}

export type Issue = 'a' | 'b' | 'nul';

export function issue(res: Resultat): Issue {
  if (res.a.points > res.b.points) return 'a';
  if (res.b.points > res.a.points) return 'b';
  return 'nul';
}

export function scoreVide() {
  return { points: 0, belotes: 0, capots: 0, annonces: 0 };
}
