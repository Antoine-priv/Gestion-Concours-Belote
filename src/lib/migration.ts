import { CRITERES } from './reglages';
import type { Concours, Critere, Donnees, Partie, Resultat } from './types';

/* Conversion des sauvegardes de la version 1 (règles toutes réglables, mode mêlée, chrono, lots…). */

type Brut = any;

const ANCIEN_DEPARTAGE_PAR_DEFAUT = JSON.stringify(['points', 'difference', 'meilleurePartie', 'tirage']);

function resultatV1(r: Brut): Resultat {
  const camp = (x: Brut) => ({ points: x.points, belotes: x.belotes ?? 0, capots: x.capots ?? 0 });
  return { a: camp(r.a), b: camp(r.b), ...(r.force ? { force: true } : {}) };
}

function partieV1(p: Brut): Partie {
  return {
    numero: p.numero,
    tables: p.tables.map((t: Brut) => ({
      numero: t.numero,
      a: t.a[0],
      b: t.b[0],
      ...(t.resultat ? { resultat: resultatV1(t.resultat) } : {}),
    })),
    ...(p.exempts?.[0] ? { exempt: p.exempts[0] } : {}),
  };
}

function concoursV1(c: Brut): Concours {
  const r = c.reglages ?? {};
  let departage: Critere[] = (r.departage ?? []).filter((k: string) => k in CRITERES);
  if (JSON.stringify(r.departage) === ANCIEN_DEPARTAGE_PAR_DEFAUT || departage.length === 0) departage = ['tirage'];
  return {
    id: c.id,
    nom: c.nom,
    date: c.date,
    ...(c.lieu ? { lieu: c.lieu } : {}),
    termine: !!c.termine,
    reglages: {
      departage,
      eviterRevanche: r.eviterRevanche ?? true,
      exemptPoints: r.exemptPoints === 'moyenne' ? 'moyenne' : 'moitie',
      exemptVictoire: r.exemptVictoire ?? false,
    },
    participants: c.participants,
    parties: c.parties.map(partieV1),
  };
}

/** Les concours « à la mêlée » ne sont plus gérés et sont écartés. */
export function migrerV1(d: Brut): Donnees {
  return {
    version: 2,
    joueurs: d.joueurs,
    equipes: d.equipes,
    concours: d.concours.filter((c: Brut) => c.reglages?.mode !== 'melee').map(concoursV1),
  };
}
