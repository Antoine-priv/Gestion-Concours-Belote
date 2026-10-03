import { describe, expect, it } from 'vitest';
import { calculerClassement } from './classement';
import { reglagesParDefaut } from './reglages';
import { verifier } from './score';
import { tirerPartie } from './tirage';
import type { Concours, Reglages, Resultat } from './types';

const camp = (points: number, belotes = 0, capots = 0, annonces = 0) => ({ points, belotes, capots, annonces });
const res = (a: ReturnType<typeof camp>, b: ReturnType<typeof camp>, donnes?: number): Resultat => ({ a, b, donnes });
const regl = (r: Partial<Reglages> = {}): Reglages => ({ ...reglagesParDefaut(), ...r });

function concours(n: number, r: Partial<Reglages> = {}): Concours {
  return {
    id: 'c1',
    nom: 'Test',
    date: '2026-10-03',
    reglages: regl(r),
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
    expect(verifier(res(camp(1000), camp(944)), regl()).ok).toBe(true);
    expect(verifier(res(camp(1000), camp(940)), regl()).ok).toBe(false);
  });

  it('belotes et capots à 252', () => {
    // 1944 + 2×20 + 90 = 2074
    expect(verifier(res(camp(1100, 1, 1), camp(974, 1)), regl()).ok).toBe(true);
  });

  it('capot à 250', () => {
    expect(verifier(res(camp(1032, 0, 1), camp(1000)), regl({ capot: 250 })).ok).toBe(true);
  });

  it('suggère une belote oubliée', () => {
    const v = verifier(res(camp(1000), camp(964)), regl());
    expect(v.ok).toBe(false);
    expect(v.message).toContain('1 belote oubliée');
  });

  it('au temps : déduit le nombre de donnes', () => {
    const v = verifier(res(camp(1000, 1), camp(802)), regl({ finPartie: 'temps' }));
    expect(v.ok).toBe(true);
    expect(v.donnesDeduites).toBe(11);
  });

  it('au temps : nombre de donnes saisi', () => {
    expect(verifier(res(camp(800), camp(820), 10), regl({ finPartie: 'temps' })).ok).toBe(true);
  });

  it('points arrondis : 16 par donne', () => {
    expect(verifier(res(camp(100, 1), camp(94)), regl({ pointsArrondis: true })).ok).toBe(true);
  });

  it('méthode du dernier chiffre', () => {
    // Belotes non saisies : 1944 + 40 = 1984 finit quand même par 4.
    expect(verifier(res(camp(1000), camp(984)), regl({ controle: 'dernierChiffre' })).ok).toBe(true);
    expect(verifier(res(camp(1000), camp(983)), regl({ controle: 'dernierChiffre' })).ok).toBe(false);
  });

  it('annonces comptées', () => {
    expect(verifier(res(camp(1050, 0, 0, 50), camp(944)), regl({ annonces: true })).ok).toBe(true);
  });
});

describe('classement', () => {
  it('victoires puis points', () => {
    const c = concours(4);
    c.parties.push({
      numero: 1,
      exempts: [],
      tables: [
        { numero: 1, a: ['e1'], b: ['e2'], resultat: res(camp(1200), camp(744)) },
        { numero: 2, a: ['e3'], b: ['e4'], resultat: res(camp(1000), camp(944)) },
      ],
    });
    const cl = calculerClassement(c);
    expect(cl.map((l) => l.id)).toEqual(['e1', 'e3', 'e4', 'e2']);
    expect(cl[0]).toMatchObject({ victoires: 1, points: 1200, contre: 744, difference: 456 });
  });

  it('exempt : victoire et moyenne des points', () => {
    const c = concours(3);
    c.parties.push({
      numero: 1,
      exempts: ['e3'],
      tables: [{ numero: 1, a: ['e1'], b: ['e2'], resultat: res(camp(1200), camp(744)) }],
    });
    const e3 = calculerClassement(c).find((l) => l.id === 'e3')!;
    expect(e3).toMatchObject({ victoires: 1, points: 972, exempts: 1, difference: 0 });
  });
});

describe('tirage', () => {
  it('partie 1 : tout le monde joue, une équipe exempte si impair', () => {
    const c = concours(9);
    const { partie } = tirerPartie(c, graine(1));
    expect(partie.tables).toHaveLength(4);
    expect(partie.exempts).toHaveLength(1);
    const ids = [...partie.tables.flatMap((t) => [...t.a, ...t.b]), ...partie.exempts];
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
        const cle = [t.a[0], t.b[0]].sort().join('-');
        expect(vus.has(cle)).toBe(false);
        vus.add(cle);
      }
    }
  });

  it('partie 2 : 1er contre 2e', () => {
    const c = concours(4);
    c.parties.push({
      numero: 1,
      exempts: [],
      tables: [
        { numero: 1, a: ['e1'], b: ['e2'], resultat: res(camp(1200), camp(744)) },
        { numero: 2, a: ['e3'], b: ['e4'], resultat: res(camp(1100), camp(844)) },
      ],
    });
    const { partie } = tirerPartie(c);
    expect(partie.tables[0]).toMatchObject({ a: ['e1'], b: ['e3'] });
    expect(partie.tables[1]).toMatchObject({ a: ['e4'], b: ['e2'] });
  });

  it("l'exempt change à chaque partie", () => {
    const c = concours(5);
    const rnd = graine(7);
    const exempts: string[] = [];
    for (let p = 0; p < 4; p++) {
      const { partie } = tirerPartie(c, rnd);
      for (const t of partie.tables) t.resultat = res(camp(1000), camp(944));
      exempts.push(...partie.exempts);
      c.parties.push(partie);
    }
    expect(new Set(exempts).size).toBe(4);
  });

  it('mêlée : partenaires différents à chaque partie', () => {
    const c = concours(18, { mode: 'melee' });
    const rnd = graine(3);
    for (let p = 0; p < 4; p++) {
      const { partie, revanches } = tirerPartie(c, rnd);
      expect(partie.tables).toHaveLength(4);
      expect(partie.exempts).toHaveLength(2);
      expect(revanches).toBe(0);
      for (const t of partie.tables) t.resultat = res(camp(1000), camp(944));
      c.parties.push(partie);
    }
  });

  it('les abandons ne sont plus tirés', () => {
    const c = concours(4);
    c.participants[0].abandonPartie = 1;
    const { partie } = tirerPartie(c);
    expect(partie.exempts).toHaveLength(1);
    expect(partie.tables.flatMap((t) => [...t.a, ...t.b])).not.toContain('e1');
  });
});

describe('pistes en cas d’écart', () => {
  it('capot oublié', () => {
    const v = verifier(res(camp(1124), camp(910)), regl());
    expect(v.message).toContain('1 capot oublié');
  });
});
