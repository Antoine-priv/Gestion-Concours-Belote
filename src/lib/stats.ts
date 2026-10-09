import { calculerClassement, scoresComptes } from './classement';
import { dateFr } from './format';
import type { Concours, Donnees, Id } from './types';

export interface StatJoueur {
  id: Id;
  concours: number;
  parties: number;
  victoires: number;
  points: number;
  belotes: number;
  capots: number;
  meilleurePartie: number;
  meilleurRang: number | null;
  premiers: number;
  podiums: number;
}

export interface Record {
  libelle: string;
  valeur: number;
  qui: string;
  concours: string;
}

/** Les deux joueurs d'une équipe. */
function joueursDe(d: Donnees, equipe: Id): Id[] {
  return d.equipes.find((e) => e.id === equipe)?.joueurs ?? [];
}

export function statsJoueurs(d: Donnees, filtre: (c: Concours) => boolean = () => true): StatJoueur[] {
  const stats = new Map<Id, StatJoueur>();
  const s = (id: Id) => {
    let x = stats.get(id);
    if (!x) {
      x = {
        id,
        concours: 0,
        parties: 0,
        victoires: 0,
        points: 0,
        belotes: 0,
        capots: 0,
        meilleurePartie: 0,
        meilleurRang: null,
        premiers: 0,
        podiums: 0,
      };
      stats.set(id, x);
    }
    return x;
  };

  for (const c of d.concours.filter(filtre)) {
    for (const p of c.parties) {
      for (const sc of scoresComptes(p)) {
        for (const j of joueursDe(d, sc.id)) {
          const x = s(j);
          x.parties++;
          if (sc.gagne) x.victoires++;
          x.points += sc.moi.points;
          x.belotes += sc.moi.belotes;
          x.capots += sc.moi.capots;
          x.meilleurePartie = Math.max(x.meilleurePartie, sc.moi.points);
        }
      }
    }
    for (const l of calculerClassement(c)) {
      for (const j of joueursDe(d, l.id)) {
        const x = s(j);
        x.concours++;
        if (!c.termine) continue;
        x.meilleurRang = x.meilleurRang == null ? l.rang : Math.min(x.meilleurRang, l.rang);
        if (l.rang === 1) x.premiers++;
        if (l.rang <= 3) x.podiums++;
      }
    }
  }
  return [...stats.values()];
}

export interface ResumeConcours {
  id: Id;
  nom: string;
  date: string;
  participants: number;
  parties: number;
  belotes: number;
  capots: number;
  meilleurePartie: number;
  vainqueur: Id | null;
}

export function resumeConcours(c: Concours): ResumeConcours {
  let belotes = 0;
  let capots = 0;
  let meilleure = 0;
  for (const p of c.parties) {
    for (const sc of scoresComptes(p)) {
      belotes += sc.moi.belotes;
      capots += sc.moi.capots;
      meilleure = Math.max(meilleure, sc.moi.points);
    }
  }
  const cl = calculerClassement(c);
  return {
    id: c.id,
    nom: c.nom,
    date: c.date,
    participants: c.participants.length,
    parties: c.parties.length,
    belotes,
    capots,
    meilleurePartie: meilleure,
    vainqueur: c.termine && cl.length ? cl[0].id : null,
  };
}

/** Meilleure partie, plus de belotes / capots en une partie, sur tous les concours. */
export function records(d: Donnees, nom: (id: Id) => string): Record[] {
  const meilleurs: { [k: string]: Record } = {};
  const garder = (cle: string, libelle: string, valeur: number, qui: string, c: Concours) => {
    if (valeur > 0 && (!meilleurs[cle] || valeur > meilleurs[cle].valeur)) {
      meilleurs[cle] = { libelle, valeur, qui, concours: `${c.nom} (${dateFr(c.date)})` };
    }
  };
  for (const c of d.concours) {
    for (const p of c.parties) {
      for (const { id, moi } of scoresComptes(p)) {
        const qui = nom(id);
        garder('points', 'Meilleure partie (points)', moi.points, qui, c);
        garder('belotes', 'Plus de belotes en une partie', moi.belotes, qui, c);
        garder('capots', 'Plus de capots en une partie', moi.capots, qui, c);
      }
    }
  }
  return Object.values(meilleurs);
}
