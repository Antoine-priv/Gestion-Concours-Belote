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

/** « equipes » : équipes déjà formées ; « melee » : partenaires tirés au sort à chaque partie. */
export type ModeConcours = 'equipes' | 'melee';
export type FinPartie = 'donnes' | 'temps' | 'score';
export type ModeClassement = 'victoires' | 'points';
export type Critere =
  | 'points'
  | 'victoires'
  | 'difference'
  | 'meilleurePartie'
  | 'pointsContre'
  | 'confrontation'
  | 'tirage';
/** complet : formule exacte ; dernierChiffre : méthode papier (le total finit par le bon chiffre). */
export type Controle = 'complet' | 'dernierChiffre' | 'aucun';
export type Appariement = 'classement' | 'hasard';

export interface Reglages {
  mode: ModeConcours;
  nbParties: number;
  finPartie: FinPartie;
  nbDonnes: number;
  dureeMinutes: number;
  scoreCible: number;
  capot: 250 | 252;
  annonces: boolean;
  pointsArrondis: boolean;
  controle: Controle;
  classement: ModeClassement;
  departage: Critere[];
  /** Comment sont formées les tables à partir de la 2e partie. */
  appariement: Appariement;
  eviterRevanche: boolean;
  exemptPoints: 'moyenne' | 'fixe';
  exemptPointsFixes: number;
  exemptVictoire: boolean;
  premiereTable: number;
  /** lots[i] : lot du rang i + 1 (facultatif). */
  lots: string[];
}

export interface Participant {
  /** Id d'une Equipe (mode équipes) ou d'un Joueur (mode mêlée). */
  id: Id;
  numero: number;
  /** Ne joue plus à partir de cette partie (abandon). */
  abandonPartie?: number;
}

export interface ScoreCamp {
  points: number;
  belotes: number;
  capots: number;
  annonces: number;
}

export interface Resultat {
  a: ScoreCamp;
  b: ScoreCamp;
  /** Nombre de donnes jouées, quand il n'est pas fixé par les réglages. */
  donnes?: number;
  /** Enregistré malgré une concordance non vérifiée. */
  force?: boolean;
}

export interface Table {
  numero: number;
  /** Participants de chaque camp : 1 équipe, ou 2 joueurs en mêlée. */
  a: Id[];
  b: Id[];
  resultat?: Resultat;
}

export interface Chrono {
  /** Horodatage du démarrage (ms), ajusté à chaque reprise. */
  debut?: number;
  /** Temps restant figé quand le chrono est en pause (ms). */
  restantPause?: number;
  dureeMs: number;
}

export interface Partie {
  numero: number;
  tables: Table[];
  exempts: Id[];
  chrono?: Chrono;
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
  version: 1;
  joueurs: Joueur[];
  equipes: Equipe[];
  concours: Concours[];
}
