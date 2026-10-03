import type { Critere, Reglages } from './types';

export function reglagesParDefaut(): Reglages {
  return {
    mode: 'equipes',
    nbParties: 4,
    finPartie: 'donnes',
    nbDonnes: 12,
    dureeMinutes: 60,
    scoreCible: 1000,
    capot: 252,
    annonces: false,
    pointsArrondis: false,
    controle: 'complet',
    classement: 'victoires',
    departage: ['points', 'difference', 'meilleurePartie', 'tirage'],
    appariement: 'classement',
    eviterRevanche: true,
    exemptPoints: 'moyenne',
    exemptPointsFixes: 0,
    exemptVictoire: true,
    premiereTable: 1,
    lots: [],
  };
}

export const LIBELLES_CRITERES: Record<Critere, string> = {
  points: 'Total des points',
  victoires: 'Nombre de parties gagnées',
  difference: 'Différence (points marqués − encaissés)',
  meilleurePartie: 'Meilleure partie',
  pointsContre: 'Le moins de points encaissés',
  confrontation: 'Confrontation directe',
  tirage: 'Tirage au sort',
};

export const TOUS_CRITERES = Object.keys(LIBELLES_CRITERES) as Critere[];
