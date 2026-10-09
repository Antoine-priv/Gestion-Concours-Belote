import type { Critere, Reglages } from './types';

/** Règles fixes des concours. */
export const NB_PARTIES = 4;
export const NB_DONNES = 12;
export const POINTS_DONNE = 162;
export const BELOTE = 20;
export const CAPOT = 252;
/** Total d'une table sans belote ni capot : 12 × 162. */
export const TOTAL_PARTIE = NB_DONNES * POINTS_DONNE;
/** Points de l'exempt par défaut : la moitié d'une partie. */
export const MOITIE_PARTIE = TOTAL_PARTIE / 2;

export function reglagesParDefaut(): Reglages {
  return {
    departage: ['tirage'],
    eviterRevanche: true,
    exemptPoints: 'moitie',
    exemptVictoire: false,
  };
}

export const CRITERES: Record<Critere, { libelle: string; explication: string }> = {
  victoires: {
    libelle: 'Nombre de parties gagnées',
    explication: "L'équipe qui a gagné le plus de parties passe devant.",
  },
  meilleurePartie: {
    libelle: 'Meilleure partie',
    explication: 'Le plus gros score réalisé en une seule partie.',
  },
  confrontation: {
    libelle: 'Confrontation directe',
    explication:
      "Si les deux équipes se sont affrontées, la gagnante passe devant. Rarement utile : sans revanche, elles se sont croisées au plus une fois, souvent jamais.",
  },
  difference: {
    libelle: 'Différence de points',
    explication:
      "Points marqués moins points marqués par les adversaires. Presque inutile : une table fait toujours environ 1944 points, donc à égalité de points la différence est quasi identique.",
  },
  pointsContre: {
    libelle: 'Le moins de points encaissés',
    explication:
      'Total des points marqués par les adversaires, le plus petit passe devant. Presque inutile, pour la même raison.',
  },
  tirage: {
    libelle: 'Tirage au sort',
    explication: "Ordre tiré au hasard une fois pour toutes : il ne change pas d'un affichage à l'autre.",
  },
};

export const TOUS_CRITERES = Object.keys(CRITERES) as Critere[];
