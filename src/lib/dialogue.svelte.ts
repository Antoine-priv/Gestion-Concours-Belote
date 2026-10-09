/** Boîtes de dialogue intégrées à l'application (remplacent confirm() et alert() du navigateur). */

export interface Demande {
  titre: string;
  message?: string;
  /** Libellé du bouton de validation. */
  valider: string;
  /** Libellé du bouton d'annulation ; absent pour un simple message d'information. */
  annuler?: string;
  /** Action destructive : bouton rouge, et le focus va sur « Annuler ». */
  danger?: boolean;
  repondre: (ok: boolean) => void;
}

export const dialogue = $state<{ courant: Demande | null }>({ courant: null });

function ouvrir(d: Omit<Demande, 'repondre'>): Promise<boolean> {
  // Une seule boîte à la fois : une demande encore ouverte est considérée comme annulée.
  dialogue.courant?.repondre(false);
  return new Promise((resoudre) => {
    dialogue.courant = {
      ...d,
      repondre: (ok) => {
        dialogue.courant = null;
        resoudre(ok);
      },
    };
  });
}

/** Demande une confirmation ; renvoie true si l'utilisateur valide. */
export function confirmer(
  titre: string,
  options: { message?: string; valider?: string; annuler?: string; danger?: boolean } = {},
): Promise<boolean> {
  return ouvrir({ titre, valider: 'Confirmer', annuler: 'Annuler', ...options });
}

/** Affiche un message avec un seul bouton « OK ». */
export async function informer(titre: string, message?: string): Promise<void> {
  await ouvrir({ titre, message, valider: 'OK' });
}
