// Atelier, onglet Clientes (décision de Jaelle, 2026-11-05) : recherche et suppression d'un compte. Pur et testé.
import { z } from 'zod';

export const DELETE_WORD = 'SUPPRIMER';
export const ADMIN_DELETIONS_PER_HOUR = 10;
export const SEARCH_RESULTS_MAX = 50;

// Suppression depuis l'Atelier : le mot tapé est revérifié ici (l'écran seul ne suffit pas).
export const deleteClientInput = z.strictObject({
  uid: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  word: z.literal(DELETE_WORD),
});
export const clientId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);

export type ClientSummary = { uid: string; email: string; name: string; createdAt: string | null; lastSignIn: string | null; admin: boolean };

// Casse, accents et espaces ignorés : « Élodie » trouve « elodie », « martin@ » trouve l'e-mail.
export const normalize = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function matchesClient(c: Pick<ClientSummary, 'email' | 'name'>, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  return normalize(c.email).includes(q) || normalize(c.name).includes(q);
}

// Comptes que l'Atelier ne supprime jamais : une administratrice (dont soi-même).
export function deletionRefusal(target: { uid: string; admin: boolean }, adminUid: string): 'admin' | null {
  return target.admin || target.uid === adminUid ? 'admin' : null;
}
