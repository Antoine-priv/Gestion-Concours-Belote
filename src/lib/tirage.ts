import { calculerClassement } from './classement';
import type { Concours, Id, Partie, Table } from './types';

export type Aleatoire = () => number;

export function melanger<T>(liste: T[], rnd: Aleatoire = Math.random): T[] {
  const t = [...liste];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

/** Équipes encore en lice pour la partie `numero`. */
export function actifs(c: Concours, numero: number): Id[] {
  return c.participants
    .filter((p) => p.abandonPartie == null || p.abandonPartie > numero)
    .map((p) => p.id);
}

const LIMITE_ESSAIS = 100_000;

/**
 * Appariement par paires consécutives (1-2, 3-4…), en sautant les adversaires
 * déjà rencontrés quand c'est possible (retour arrière borné).
 */
export function apparier(ordre: Id[], dejaJoue: (a: Id, b: Id) => boolean): [Id, Id][] | null {
  let essais = 0;
  const resultat: [Id, Id][] = [];
  const restant = [...ordre];

  const chercher = (): boolean => {
    if (restant.length === 0) return true;
    if (++essais > LIMITE_ESSAIS) return false;
    const premier = restant.shift()!;
    for (let j = 0; j < restant.length; j++) {
      const autre = restant[j];
      if (dejaJoue(premier, autre)) continue;
      restant.splice(j, 1);
      resultat.push([premier, autre]);
      if (chercher()) return true;
      resultat.pop();
      restant.splice(j, 0, autre);
    }
    restant.unshift(premier);
    return false;
  };

  return chercher() ? resultat : null;
}

function paires<T>(liste: T[]): [T, T][] {
  const r: [T, T][] = [];
  for (let i = 0; i + 1 < liste.length; i += 2) r.push([liste[i], liste[i + 1]]);
  return r;
}

export interface ResultatTirage {
  partie: Partie;
  /** Nombre de revanches qu'il n'a pas été possible d'éviter. */
  revanches: number;
}

/**
 * Tables de la prochaine partie : tirage au sort pour la 1re, puis selon le classement
 * (1er contre 2e, 3e contre 4e…). Avec un nombre impair d'équipes, la moins bien classée
 * qui n'a pas encore été exempte ne joue pas.
 */
export function tirerPartie(c: Concours, rnd: Aleatoire = Math.random): ResultatTirage {
  const numero = c.parties.length + 1;
  const ids = actifs(c, numero);
  if (ids.length < 2) throw new Error('Il faut au moins 2 équipes pour faire un tirage.');

  const lignes = new Map(calculerClassement(c, numero - 1).map((l) => [l.id, l]));
  const enLice = new Set(ids);
  let ordre =
    numero === 1
      ? melanger(ids, rnd)
      : calculerClassement(c, numero - 1)
          .filter((l) => enLice.has(l.id))
          .map((l) => l.id);

  let exempt: Id | undefined;
  if (ordre.length % 2 === 1) {
    const dejaExempts = new Set(c.parties.map((p) => p.exempt).filter(Boolean));
    const candidats = [...ordre].reverse();
    exempt = candidats.find((id) => !dejaExempts.has(id)) ?? candidats[0];
    ordre = ordre.filter((id) => id !== exempt);
  }

  const dejaJoue = (a: Id, b: Id) => lignes.get(a)?.adversaires.includes(b) ?? false;
  let couples = c.reglages.eviterRevanche ? apparier(ordre, dejaJoue) : null;
  if (!couples) couples = paires(ordre);
  const revanches = couples.filter(([a, b]) => dejaJoue(a, b)).length;

  const tables: Table[] = couples.map(([a, b], i) => ({ numero: i + 1, a, b }));
  return { partie: { numero, tables, ...(exempt ? { exempt } : {}) }, revanches };
}
