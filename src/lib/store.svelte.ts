import { NB_PARTIES, reglagesParDefaut } from './reglages';
import {
  choisirFichierAuto,
  ecrireFichier,
  ecrireLocal,
  lireLocal,
  oublierFichierAuto,
  permissionFichier,
  poigneeEnregistree,
  surChangementExterne,
  type Poignee,
} from './stockage';
import { tirerPartie } from './tirage';
import type { Concours, Donnees, Equipe, Id, Joueur, Partie, Resultat } from './types';

export const app = $state<{ donnees: Donnees }>({ donnees: lireLocal() });

export const sauvegarde = $state({
  fichier: null as string | null,
  /** Le fichier est choisi mais Chrome demande de réautoriser l'accès. */
  aReautoriser: false,
  derniere: null as Date | null,
  erreur: null as string | null,
});

let poignee: Poignee | undefined;
let minuterie: ReturnType<typeof setTimeout> | undefined;

async function ecrireDansFichier(json: string) {
  if (!poignee || sauvegarde.aReautoriser) return;
  try {
    await ecrireFichier(poignee, json);
    sauvegarde.derniere = new Date();
    sauvegarde.erreur = null;
  } catch (e) {
    sauvegarde.erreur = `Échec de la sauvegarde dans le fichier : ${(e as Error).message}`;
  }
}

/** Active l'enregistrement automatique (sauf pour l'écran d'affichage, en lecture seule). */
export function demarrerSauvegarde(lectureSeule: boolean) {
  surChangementExterne((d) => (app.donnees = d));
  if (lectureSeule) return;

  $effect.root(() => {
    $effect(() => {
      const json = JSON.stringify(app.donnees);
      if (!ecrireLocal(json)) return;
      clearTimeout(minuterie);
      minuterie = setTimeout(() => ecrireDansFichier(json), 800);
    });
  });

  poigneeEnregistree().then(async (p) => {
    if (!p) return;
    poignee = p;
    sauvegarde.fichier = p.name;
    sauvegarde.aReautoriser = !(await permissionFichier(p, false).catch(() => false));
  });
}

export async function activerFichierAuto() {
  poignee = await choisirFichierAuto();
  sauvegarde.fichier = poignee.name;
  sauvegarde.aReautoriser = false;
  await ecrireDansFichier(JSON.stringify(app.donnees));
}

export async function reautoriserFichier() {
  if (!poignee) return;
  sauvegarde.aReautoriser = !(await permissionFichier(poignee, true));
  if (!sauvegarde.aReautoriser) await ecrireDansFichier(JSON.stringify(app.donnees));
}

export async function desactiverFichierAuto() {
  await oublierFichierAuto();
  poignee = undefined;
  sauvegarde.fichier = null;
  sauvegarde.aReautoriser = false;
}

export function remplacerDonnees(d: Donnees) {
  app.donnees = d;
}

// --- Identifiants et noms ---

export function uid(): Id {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function normaliser(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function joueur(id: Id): Joueur | undefined {
  return app.donnees.joueurs.find((j) => j.id === id);
}

export function equipe(id: Id): Equipe | undefined {
  return app.donnees.equipes.find((e) => e.id === id);
}

export function concours(id: Id): Concours | undefined {
  return app.donnees.concours.find((c) => c.id === id);
}

export function nomJoueur(id: Id): string {
  return joueur(id)?.nom ?? '?';
}

export function nomsEquipe(e: Equipe): string {
  return e.joueurs.map(nomJoueur).join(' / ');
}

export function nomEquipe(e: Equipe): string {
  return e.nom || nomsEquipe(e);
}

/** Nom d'une équipe inscrite : son nom d'équipe, ou ses deux joueurs. */
export function nomParticipant(id: Id): string {
  const e = equipe(id);
  return e ? nomEquipe(e) : '?';
}

export function numeroParticipant(c: Concours, id: Id): number {
  return c.participants.find((p) => p.id === id)?.numero ?? 0;
}

/** Nombre de parties prévues : 4, ou plus si des parties ont été ajoutées. */
export function nbPartiesPrevues(c: Concours): number {
  return Math.max(NB_PARTIES, c.parties.length);
}

// --- Joueurs et équipes ---

export function chercherJoueur(nom: string): Joueur | undefined {
  const cle = normaliser(nom);
  return app.donnees.joueurs.find((j) => normaliser(j.nom) === cle);
}

export function trouverOuCreerJoueur(nom: string): Joueur {
  const existant = chercherJoueur(nom);
  if (existant) return existant;
  const j: Joueur = { id: uid(), nom: nom.replace(/\s+/g, ' ').trim() };
  app.donnees.joueurs.push(j);
  return app.donnees.joueurs[app.donnees.joueurs.length - 1];
}

export function trouverOuCreerEquipe(j1: Id, j2: Id, nom?: string): Equipe {
  const existante = app.donnees.equipes.find(
    (e) => (e.joueurs[0] === j1 && e.joueurs[1] === j2) || (e.joueurs[0] === j2 && e.joueurs[1] === j1),
  );
  if (existante) {
    if (nom) existante.nom = nom;
    return existante;
  }
  const e: Equipe = { id: uid(), joueurs: [j1, j2], ...(nom ? { nom } : {}) };
  app.donnees.equipes.push(e);
  return app.donnees.equipes[app.donnees.equipes.length - 1];
}

/** Concours où un joueur a été inscrit (via l'une de ses équipes). */
export function utilisationsJoueur(id: Id): Concours[] {
  const equipes = new Set(app.donnees.equipes.filter((e) => e.joueurs.includes(id)).map((e) => e.id));
  return app.donnees.concours.filter((c) => c.participants.some((p) => equipes.has(p.id)));
}

export function supprimerJoueur(id: Id) {
  if (utilisationsJoueur(id).length) throw new Error('Ce joueur a participé à un concours.');
  app.donnees.equipes = app.donnees.equipes.filter((e) => !e.joueurs.includes(id));
  app.donnees.joueurs = app.donnees.joueurs.filter((j) => j.id !== id);
}

/** Fusionne deux fiches d'un même joueur (doublon) : `doublon` est remplacé par `garde`. */
export function fusionnerJoueurs(garde: Id, doublon: Id) {
  if (garde === doublon) return;
  const d = app.donnees;
  // Les concours ne référencent que des équipes : il suffit de corriger le registre.
  for (const e of d.equipes) e.joueurs = e.joueurs.map((x) => (x === doublon ? garde : x)) as [Id, Id];
  d.joueurs = d.joueurs.filter((j) => j.id !== doublon);
}

// --- Concours ---

/** Un nouveau concours part toujours des réglages par défaut (modifiables dans son onglet « Réglages »). */
export function creerConcours(nom: string, date: string, lieu: string): Id {
  const id = uid();
  const reglages = reglagesParDefaut();
  app.donnees.concours.unshift({ id, nom, date, lieu, reglages, participants: [], parties: [], termine: false });
  return id;
}

export function supprimerConcours(id: Id) {
  app.donnees.concours = app.donnees.concours.filter((c) => c.id !== id);
}

export function inscrire(c: Concours, id: Id) {
  if (c.participants.some((p) => p.id === id)) throw new Error('Déjà inscrit à ce concours.');
  const numero = Math.max(0, ...c.participants.map((p) => p.numero)) + 1;
  c.participants.push({ id, numero });
}

export function aJoue(c: Concours, id: Id): boolean {
  return c.parties.some(
    (p) => p.exempt === id || p.rattrapage?.adversaire === id || p.tables.some((t) => t.a === id || t.b === id),
  );
}

export function desinscrire(c: Concours, id: Id) {
  if (aJoue(c, id)) throw new Error('Déjà dans un tirage : utilisez « Abandon » à la place.');
  c.participants = c.participants.filter((p) => p.id !== id);
}

/** Renumérote les participants 1, 2, 3… dans l'ordre actuel. */
export function renumeroter(c: Concours) {
  [...c.participants].sort((a, b) => a.numero - b.numero).forEach((p, i) => (p.numero = i + 1));
}

export function abandonner(c: Concours, id: Id, aPartirDe: number | undefined) {
  const p = c.participants.find((x) => x.id === id);
  if (!p) return;
  if (aPartirDe == null) delete p.abandonPartie;
  else p.abandonPartie = aPartirDe;
}

export function lancerTirage(c: Concours): number {
  const { partie, revanches } = tirerPartie($state.snapshot(c) as Concours);
  c.parties.push(partie);
  return revanches;
}

export function annulerDernierePartie(c: Concours) {
  c.parties.pop();
  c.termine = false;
}

export function enregistrerResultat(c: Concours, partie: number, table: number, res: Resultat | undefined) {
  const t = c.parties.find((p) => p.numero === partie)?.tables.find((x) => x.numero === table);
  if (!t) return;
  if (res) t.resultat = res;
  else delete t.resultat;
}

function partie(c: Concours, numero: number): Partie | undefined {
  return c.parties.find((p) => p.numero === numero);
}

/** L'exempt joue contre une équipe qui a fini tôt ; seul son score à lui comptera. */
export function lancerRattrapage(c: Concours, numero: number, adversaire: Id) {
  const p = partie(c, numero);
  if (p?.exempt) p.rattrapage = { adversaire };
}

export function annulerRattrapage(c: Concours, numero: number) {
  const p = partie(c, numero);
  if (p) delete p.rattrapage;
}

export function enregistrerRattrapage(c: Concours, numero: number, res: Resultat | undefined) {
  const r = partie(c, numero)?.rattrapage;
  if (!r) return;
  if (res) r.resultat = res;
  else delete r.resultat;
}

/** Échange deux équipes entre deux places du tirage. */
export function echangerPlaces(
  c: Concours,
  partie: number,
  x: { table: number; cote: 'a' | 'b' },
  y: { table: number; cote: 'a' | 'b' },
) {
  const p = c.parties.find((q) => q.numero === partie);
  const tx = p?.tables.find((t) => t.numero === x.table);
  const ty = p?.tables.find((t) => t.numero === y.table);
  if (!tx || !ty) return;
  const tmp = tx[x.cote];
  tx[x.cote] = ty[y.cote];
  ty[y.cote] = tmp;
  delete tx.resultat;
  delete ty.resultat;
}

/** Toutes les tables saisies, ainsi que le rattrapage s'il a été lancé. */
export function partieComplete(c: Concours, numero: number): boolean {
  const p = partie(c, numero);
  return !!p && p.tables.every((t) => t.resultat) && (!p.rattrapage || !!p.rattrapage.resultat);
}
