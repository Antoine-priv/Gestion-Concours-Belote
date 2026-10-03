import { calculerClassement, type Ligne } from './classement';
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

/** Participants encore en lice pour la partie `numero`. */
export function actifs(c: Concours, numero: number): Id[] {
  return c.participants
    .filter((p) => p.abandonPartie == null || p.abandonPartie > numero)
    .map((p) => p.id);
}

/**
 * Retire `n` exempts en partant de la fin de la liste (les moins bien classés),
 * en privilégiant ceux qui ont été exemptés le moins souvent.
 */
function choisirExempts(ordre: Id[], n: number, nbExempts: Map<Id, number>): Id[] {
  const candidats = [...ordre].reverse();
  candidats.sort((x, y) => (nbExempts.get(x) ?? 0) - (nbExempts.get(y) ?? 0));
  return candidats.slice(0, n);
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

/** Ordre des participants pour former les tables de la partie `numero`. */
function ordreTirage(c: Concours, numero: number, ids: Id[], rnd: Aleatoire): Id[] {
  if (numero === 1 || c.reglages.appariement === 'hasard') return melanger(ids, rnd);
  const enLice = new Set(ids);
  return calculerClassement(c, numero - 1)
    .filter((l) => enLice.has(l.id))
    .map((l) => l.id);
}

function historique(c: Concours, numero: number) {
  const lignes = new Map<Id, Ligne>(calculerClassement(c, numero - 1).map((l) => [l.id, l]));
  const nbExempts = new Map<Id, number>();
  for (const p of c.parties) {
    if (p.numero >= numero) continue;
    for (const id of p.exempts) nbExempts.set(id, (nbExempts.get(id) ?? 0) + 1);
  }
  return { lignes, nbExempts };
}

export interface ResultatTirage {
  partie: Partie;
  /** Nombre de revanches qu'il n'a pas été possible d'éviter. */
  revanches: number;
}

function tirageEquipes(c: Concours, numero: number, rnd: Aleatoire): ResultatTirage {
  const ids = actifs(c, numero);
  if (ids.length < 2) throw new Error('Il faut au moins 2 équipes pour faire un tirage.');
  const { lignes, nbExempts } = historique(c, numero);
  let ordre = ordreTirage(c, numero, ids, rnd);

  const exempts = ordre.length % 2 === 1 ? choisirExempts(ordre, 1, nbExempts) : [];
  ordre = ordre.filter((id) => !exempts.includes(id));

  const dejaJoue = (a: Id, b: Id) => lignes.get(a)?.adversaires.includes(b) ?? false;
  let couples = c.reglages.eviterRevanche ? apparier(ordre, dejaJoue) : null;
  if (!couples) couples = paires(ordre);
  const revanches = couples.filter(([a, b]) => dejaJoue(a, b)).length;

  const tables: Table[] = couples.map(([a, b], i) => ({
    numero: c.reglages.premiereTable + i,
    a: [a],
    b: [b],
  }));
  return { partie: { numero, tables, exempts }, revanches };
}

/** Les 3 façons de former 2 équipes avec 4 joueurs, la plus équilibrée d'abord (1+4 contre 2+3). */
const DECOUPAGES: [number, number, number, number][] = [
  [0, 3, 1, 2],
  [0, 2, 1, 3],
  [0, 1, 2, 3],
];

function tirageMelee(c: Concours, numero: number, rnd: Aleatoire): ResultatTirage {
  const ids = actifs(c, numero);
  if (ids.length < 4) throw new Error('Il faut au moins 4 joueurs pour faire un tirage.');
  const { lignes, nbExempts } = historique(c, numero);
  let ordre = ordreTirage(c, numero, ids, rnd);

  const exempts = choisirExempts(ordre, ordre.length % 4, nbExempts);
  ordre = ordre.filter((id) => !exempts.includes(id));

  const dejaPartenaires = (a: Id, b: Id) => lignes.get(a)?.partenaires.includes(b) ?? false;
  const dejaAdversaires = (a: Id, b: Id) => lignes.get(a)?.adversaires.includes(b) ?? false;
  const auHasard = numero === 1 || c.reglages.appariement === 'hasard';

  const tables: Table[] = [];
  let revanches = 0;
  for (let i = 0; i < ordre.length; i += 4) {
    const g = ordre.slice(i, i + 4);
    const options = auHasard ? melanger(DECOUPAGES, rnd) : DECOUPAGES;
    // Coût : partenaires déjà associés (à éviter en priorité), puis adversaires déjà rencontrés.
    const cout = ([w, x, y, z]: number[]) => {
      const part = Number(dejaPartenaires(g[w], g[x])) + Number(dejaPartenaires(g[y], g[z]));
      const adv = [g[w], g[x]].reduce((s, p) => s + Number(dejaAdversaires(p, g[y])) + Number(dejaAdversaires(p, g[z])), 0);
      return part * 10 + (c.reglages.eviterRevanche ? adv : 0);
    };
    const meilleur = options.reduce((m, o) => (cout(o) < cout(m) ? o : m));
    const [w, x, y, z] = meilleur;
    if (dejaPartenaires(g[w], g[x]) || dejaPartenaires(g[y], g[z])) revanches++;
    tables.push({ numero: c.reglages.premiereTable + i / 4, a: [g[w], g[x]], b: [g[y], g[z]] });
  }
  return { partie: { numero, tables, exempts }, revanches };
}

/** Tire au sort (ou apparie selon le classement) les tables de la prochaine partie. */
export function tirerPartie(c: Concours, rnd: Aleatoire = Math.random): ResultatTirage {
  const numero = c.parties.length + 1;
  return c.reglages.mode === 'melee' ? tirageMelee(c, numero, rnd) : tirageEquipes(c, numero, rnd);
}
