import { migrerV1 } from './migration';
import type { Donnees } from './types';

const CLE = 'belote-concours';

export function donneesVides(): Donnees {
  return { version: 2, joueurs: [], equipes: [], concours: [] };
}

/** Vérifie une sauvegarde et la convertit au format actuel si elle est ancienne. */
export function valider(d: unknown): Donnees {
  const x = d as { version?: number; joueurs?: unknown; equipes?: unknown; concours?: unknown } | null;
  if (!x || !Array.isArray(x.joueurs) || !Array.isArray(x.equipes) || !Array.isArray(x.concours)) {
    throw new Error("Ce fichier n'est pas une sauvegarde de l'application.");
  }
  if (x.version === 1) return migrerV1(x);
  if (x.version === 2) return x as Donnees;
  throw new Error('Cette sauvegarde vient d’une version plus récente de l’application.');
}

export function lireLocal(): Donnees {
  try {
    const brut = localStorage.getItem(CLE);
    return brut ? valider(JSON.parse(brut)) : donneesVides();
  } catch {
    return donneesVides();
  }
}

let dernierEcrit: string | null = null;

/** Écrit dans le navigateur ; renvoie false si rien n'a changé. */
export function ecrireLocal(json: string): boolean {
  if (json === dernierEcrit) return false;
  dernierEcrit = json;
  localStorage.setItem(CLE, json);
  return true;
}

/** Appelé quand un autre onglet a modifié les données. */
export function surChangementExterne(rappel: (d: Donnees) => void): void {
  window.addEventListener('storage', (e) => {
    if (e.key !== CLE || !e.newValue) return;
    dernierEcrit = e.newValue;
    try {
      rappel(valider(JSON.parse(e.newValue)));
    } catch {
      /* contenu illisible : on l'ignore */
    }
  });
}

export function telecharger(nom: string, contenu: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function lireFichier(fichier: File): Promise<Donnees> {
  return fichier.text().then((t) => valider(JSON.parse(t)));
}

// --- Sauvegarde automatique dans un fichier (Chrome / Edge) ---

interface Poignee {
  name: string;
  queryPermission(o: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(o: { mode: 'readwrite' }): Promise<PermissionState>;
  createWritable(): Promise<{ write(d: string): Promise<void>; close(): Promise<void> }>;
}

export const fichierAutoDisponible = typeof window !== 'undefined' && 'showSaveFilePicker' in window;

function base(): Promise<IDBDatabase> {
  return new Promise((ok, ko) => {
    const req = indexedDB.open('belote-concours', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('fichiers');
    req.onsuccess = () => ok(req.result);
    req.onerror = () => ko(req.error);
  });
}

async function idb<T>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await base();
  return new Promise((ok, ko) => {
    const req = op(db.transaction('fichiers', mode).objectStore('fichiers'));
    req.onsuccess = () => ok(req.result as T);
    req.onerror = () => ko(req.error);
  });
}

export async function poigneeEnregistree(): Promise<Poignee | undefined> {
  try {
    return await idb<Poignee | undefined>('readonly', (s) => s.get('auto'));
  } catch {
    return undefined;
  }
}

export async function choisirFichierAuto(): Promise<Poignee> {
  const picker = (window as unknown as { showSaveFilePicker: (o: object) => Promise<Poignee> }).showSaveFilePicker;
  const p = await picker({
    suggestedName: 'sauvegarde-belote.json',
    types: [{ description: 'Sauvegarde belote', accept: { 'application/json': ['.json'] } }],
  });
  await idb('readwrite', (s) => s.put(p, 'auto'));
  return p;
}

export async function oublierFichierAuto(): Promise<void> {
  await idb('readwrite', (s) => s.delete('auto'));
}

export async function permissionFichier(p: Poignee, demander: boolean): Promise<boolean> {
  if ((await p.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
  if (!demander) return false;
  return (await p.requestPermission({ mode: 'readwrite' })) === 'granted';
}

export async function ecrireFichier(p: Poignee, json: string): Promise<void> {
  const w = await p.createWritable();
  await w.write(json);
  await w.close();
}

export type { Poignee };
