export type Id = string;

export interface Joueur {
  id: Id;
  /** Nom complet, tel que saisi (ex. « Dupont Jean »). */
  nom: string;
  telephone?: string;
  notes?: string;
}

/** Équipe du registre : une paire de joueurs, réutilisée d'un concours à l'autre. */
export interface Equipe {
  id: Id;
  nom?: string;
  joueurs: [Id, Id];
}

/** Critères de départage, appliqués après le total des points. */
export type Critere = 'victoires' | 'meilleurePartie' | 'confrontation' | 'difference' | 'pointsContre' | 'tirage';

export interface Reglages {
  /** Ordre des critères en cas d'égalité de points. */
  departage: Critere[];
  eviterRevanche: boolean;
  /** Points de l'équipe exempte : moitié d'une partie (972) ou moyenne des équipes de la partie. */
  exemptPoints: 'moitie' | 'moyenne';
  exemptVictoire: boolean;
}

export interface Participant {
  /** Id d'une Equipe du registre. */
  id: Id;
  numero: number;
  /** Ne joue plus à partir de cette partie (abandon). */
  abandonPartie?: number;
}

export interface ScoreCamp {
  points: number;
  belotes: number;
  capots: number;
}

export interface Resultat {
  a: ScoreCamp;
  b: ScoreCamp;
  /** Enregistré malgré une concordance non vérifiée. */
  force?: boolean;
}

export interface Table {
  numero: number;
  a: Id;
  b: Id;
  resultat?: Resultat;
}

/**
 * Match joué par l'équipe exempte contre une équipe qui a fini tôt.
 * Seul le score de l'exempt (camp a du résultat) compte ; le score de l'adversaire n'est pas pris en compte.
 */
export interface Rattrapage {
  adversaire: Id;
  resultat?: Resultat;
}

export interface Partie {
  numero: number;
  tables: Table[];
  exempt?: Id;
  rattrapage?: Rattrapage;
}

export interface Concours {
  id: Id;
  nom: string;
  date: string;
  lieu?: string;
  reglages: Reglages;
  participants: Participant[];
  parties: Partie[];
  termine: boolean;
}

export interface Donnees {
  version: 2;
  joueurs: Joueur[];
  equipes: Equipe[];
  concours: Concours[];
}
