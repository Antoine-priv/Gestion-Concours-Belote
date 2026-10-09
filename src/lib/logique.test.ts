import { describe, expect, it } from 'vitest';
import { calculerClassement } from './classement';
import { migrerV1 } from './migration';
import { reglagesParDefaut } from './reglages';
import { verifier } from './score';
import { tirerPartie } from './tirage';
import type { Concours, Reglages, Resultat } from './types';

const camp = (points: number, belotes = 0, capots = 0) => ({ points, belotes, capots });
const res = (a: ReturnType<typeof camp>, b: ReturnType<typeof camp>): Resultat => ({ a, b });

function concours(n: number, r: Partial<Reglages> = {}): Concours {
  return {
    id: 'c1',
    nom: 'Test',
    date: '2026-10-03',
    reglages: { ...reglagesParDefaut(), ...r },
    participants: Array.from({ length: n }, (_, i) => ({ id: `e${i + 1}`, numero: i + 1 })),
    parties: [],
    termine: false,
  };
}

/** Générateur pseudo-aléatoire déterministe. */
function graine(s: number) {
  return () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
}

describe('vérification des points', () => {
  it('12 donnes sans bonus : 1944', () => {
    expect(verifier(res(camp(1000), camp(944))).ok).toBe(true);
    expect(verifier(res(camp(1000), camp(940))).ok).toBe(false);
  });

  it('belotes et capots à 252', () => {
    // 1944 + 2×20 + 90 = 2074
    expect(verifier(res(camp(1100, 1, 1), camp(974, 1))).ok).toBe(true);
  });

  it('suggère une belote oubliée', () => {
    expect(verifier(res(camp(1000), camp(964))).message).toContain('1 belote oubliée');
  });

  it('suggère un capot oublié', () => {
    expect(verifier(res(camp(1124), camp(910))).message).toContain('1 capot oublié');
  });
});

describe('classement', () => {
  it('au total des points', () => {
    const c = concours(4);
    c.parties.push({
      numero: 1,
      tables: [
        { numero: 1, a: 'e1', b: 'e2', resultat: res(camp(1200), camp(744)) },
        { numero: 2, a: 'e3', b: 'e4', resultat: res(camp(1000), camp(944)) },
      ],
    });
    const cl = calculerClassement(c);
    expect(cl.map((l) => l.id)).toEqual(['e1', 'e3', 'e4', 'e2']);
    expect(cl[0]).toMatchObject({ victoires: 1, points: 1200, contre: 744, difference: 456 });
  });

  it('départage par parties gagnées quand on le demande', () => {
    const c = concours(4, { departage: ['victoires'] });
    c.parties.push({
      numero: 1,
      tables: [
        { numero: 1, a: 'e1', b: 'e2', resultat: res(camp(1000), camp(944)) },
        { numero: 2, a: 'e3', b: 'e4', resultat: res(camp(944), camp(1000)) },
      ],
    });
    c.parties.push({
      numero: 2,
      tables: [
        { numero: 1, a: 'e1', b: 'e4', resultat: res(camp(944), camp(1000)) },
        { numero: 2, a: 'e2', b: 'e3', resultat: res(camp(1000), camp(944)) },
      ],
    });
    // e1 et e4 : 1944 points chacun ; e4 a gagné 2 parties, e1 une seule.
    const cl = calculerClassement(c);
    expect(cl.findIndex((l) => l.id === 'e4')).toBeLessThan(cl.findIndex((l) => l.id === 'e1'));
  });

  it('exempt : moitié des points (972), sans victoire par défaut', () => {
    const c = concours(3);
    c.parties.push({
      numero: 1,
      exempt: 'e3',
      tables: [{ numero: 1, a: 'e1', b: 'e2', resultat: res(camp(1200, 2), camp(784)) }],
    });
    const e3 = calculerClassement(c).find((l) => l.id === 'e3')!;
    expect(e3).toMatchObject({ victoires: 0, points: 972, exempts: 1, difference: 0 });
  });

  it('exempt : moyenne des points de la partie', () => {
    const c = concours(3, { exemptPoints: 'moyenne', exemptVictoire: true });
    c.parties.push({
      numero: 1,
      exempt: 'e3',
      tables: [{ numero: 1, a: 'e1', b: 'e2', resultat: res(camp(1200, 2), camp(784)) }],
    });
    expect(calculerClassement(c).find((l) => l.id === 'e3')).toMatchObject({ victoires: 1, points: 992 });
  });

  it("rattrapage : l'exempt garde son score, l'adversaire joue pour du beurre", () => {
    const c = concours(3);
    c.parties.push({
      numero: 1,
      exempt: 'e3',
      rattrapage: { adversaire: 'e1', resultat: res(camp(800), camp(1144)) },
      tables: [{ numero: 1, a: 'e1', b: 'e2', resultat: res(camp(1000), camp(944)) }],
    });
    const cl = calculerClassement(c);
    expect(cl.find((l) => l.id === 'e3')).toMatchObject({ points: 800, exempts: 0, joues: 1 });
    expect(cl.find((l) => l.id === 'e1')).toMatchObject({ points: 1000, joues: 1 });
    // Le rattrapage ne compte pas comme une rencontre.
    expect(cl.find((l) => l.id === 'e3')!.adversaires).toEqual([]);
  });
});

describe('tirage', () => {
  it('partie 1 : tout le monde joue, une équipe exempte si impair', () => {
    const { partie } = tirerPartie(concours(9), graine(1));
    expect(partie.tables).toHaveLength(4);
    expect(partie.tables.map((t) => t.numero)).toEqual([1, 2, 3, 4]);
    expect(partie.exempt).toBeDefined();
    const ids = [...partie.tables.flatMap((t) => [t.a, t.b]), partie.exempt];
    expect(new Set(ids).size).toBe(9);
  });

  it('4 parties sans revanche (système suisse)', () => {
    const c = concours(16);
    const rnd = graine(42);
    for (let p = 0; p < 4; p++) {
      const { partie, revanches } = tirerPartie(c, rnd);
      expect(revanches).toBe(0);
      for (const t of partie.tables) {
        const pts = Math.floor(rnd() * 1944);
        t.resultat = res(camp(pts), camp(1944 - pts));
      }
      c.parties.push(partie);
    }
    const vus = new Set<string>();
    for (const p of c.parties) {
      for (const t of p.tables) {
        const cle = [t.a, t.b].sort().join('-');
        expect(vus.has(cle)).toBe(false);
        vus.add(cle);
      }
    }
  });

  it('partie 2 : 1er contre 2e', () => {
    const c = concours(4);
    c.parties.push({
      numero: 1,
      tables: [
        { numero: 1, a: 'e1', b: 'e2', resultat: res(camp(1200), camp(744)) },
        { numero: 2, a: 'e3', b: 'e4', resultat: res(camp(1100), camp(844)) },
      ],
    });
    const { partie } = tirerPartie(c);
    expect(partie.tables[0]).toMatchObject({ a: 'e1', b: 'e3' });
    expect(partie.tables[1]).toMatchObject({ a: 'e4', b: 'e2' });
  });

  it("l'exempt change à chaque partie", () => {
    const c = concours(5);
    const rnd = graine(7);
    const exempts: string[] = [];
    for (let p = 0; p < 4; p++) {
      const { partie } = tirerPartie(c, rnd);
      for (const t of partie.tables) t.resultat = res(camp(1000), camp(944));
      exempts.push(partie.exempt!);
      c.parties.push(partie);
    }
    expect(new Set(exempts).size).toBe(4);
  });

  it('les abandons ne sont plus tirés', () => {
    const c = concours(4);
    c.participants[0].abandonPartie = 1;
    const { partie } = tirerPartie(c);
    expect(partie.exempt).toBeDefined();
    expect(partie.tables.flatMap((t) => [t.a, t.b])).not.toContain('e1');
  });
});

describe('migration des anciennes sauvegardes', () => {
  it('convertit un concours v1 et écarte la mêlée', () => {
    const v1 = {
      version: 1,
      joueurs: [],
      equipes: [],
      concours: [
        {
          id: 'a',
          nom: 'Ancien',
          date: '2026-10-03',
          termine: true,
          reglages: {
            mode: 'equipes',
            departage: ['points', 'difference', 'meilleurePartie', 'tirage'],
            eviterRevanche: true,
            exemptPoints: 'moyenne',
            exemptVictoire: true,
            lots: ['Jambon'],
          },
          participants: [{ id: 'e1', numero: 1 }],
          parties: [
            {
              numero: 1,
              exempts: ['e3'],
              chrono: { dureeMs: 1 },
              tables: [
                { numero: 1, a: ['e1'], b: ['e2'], resultat: { a: { points: 1000, belotes: 0, capots: 0, annonces: 0 }, b: { points: 944, belotes: 0, capots: 0, annonces: 0 }, donnes: 12 } },
              ],
            },
          ],
        },
        { id: 'm', nom: 'Mêlée', date: '2026-10-03', reglages: { mode: 'melee' }, participants: [], parties: [] },
      ],
    };
    const d = migrerV1(v1);
    expect(d.version).toBe(2);
    expect(d.concours).toHaveLength(1);
    const c = d.concours[0];
    expect(c.reglages).toEqual({ departage: ['tirage'], eviterRevanche: true, exemptPoints: 'moyenne', exemptVictoire: true });
    expect(c.parties[0]).toEqual({
      numero: 1,
      exempt: 'e3',
      tables: [{ numero: 1, a: 'e1', b: 'e2', resultat: { a: camp(1000), b: camp(944) } }],
    });
  });
});
