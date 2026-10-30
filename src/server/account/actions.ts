'use server';

// Server Actions de l'espace client. Session obligatoire, entrées validées avec Zod, la cliente n'agit que sur
// ses propres données (uid lu dans la session, jamais dans l'entrée). Aucune adresse ni e-mail dans les journaux.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SENSITIVE_ACTION_SECONDS, SESSION_COOKIE, isRecent } from '../auth/policy';
import { getSessionUser } from '../auth/session';
import { deleteAddress, saveAddress } from './addresses';
import { deleteAccount, exportData, type DeleteResult } from './data';
import { deleteAccountInput, deleteAddressInput, saveAddressInput } from './logic';

export type AddressResult = 'ok' | 'plein' | 'introuvable' | 'invalide' | 'connexion' | 'erreur';

export async function saveAddressAction(input: unknown): Promise<AddressResult> {
  const parsed = saveAddressInput.safeParse(input);
  if (!parsed.success) return 'invalide';
  const user = await getSessionUser();
  if (!user) return 'connexion';
  try {
    return await saveAddress(user.uid, parsed.data.id, parsed.data.address);
  } catch {
    console.error('compte : adresse non enregistrée');
    return 'erreur';
  }
}

export async function deleteAddressAction(input: unknown): Promise<AddressResult> {
  const parsed = deleteAddressInput.safeParse(input);
  if (!parsed.success) return 'invalide';
  const user = await getSessionUser();
  if (!user) return 'connexion';
  try {
    await deleteAddress(user.uid, parsed.data.id);
    return 'ok';
  } catch {
    console.error('compte : adresse non supprimée');
    return 'erreur';
  }
}

// Export : renvoyé au navigateur de la seule propriétaire, qui l'enregistre en fichier.
export async function exportDataAction(): Promise<{ ok: true; json: string } | { ok: false; reason: 'connexion' | 'erreur' }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, reason: 'connexion' };
  try {
    return { ok: true, json: JSON.stringify(await exportData(user.uid, user.email), null, 2) };
  } catch {
    console.error('compte : export impossible');
    return { ok: false, reason: 'erreur' };
  }
}

export type DeleteAccountResult = Exclude<DeleteResult, 'supprime'> | 'reconnexion' | 'invalide' | 'erreur';

// Suppression : confirmation explicite et connexion de moins de 10 minutes (comme le mot de passe).
export async function deleteAccountAction(input: unknown): Promise<DeleteAccountResult> {
  const parsed = deleteAccountInput.safeParse(input);
  if (!parsed.success) return 'invalide';
  const user = await getSessionUser();
  if (!user || !isRecent(user.authTime, SENSITIVE_ACTION_SECONDS)) return 'reconnexion';
  let result: DeleteResult;
  try {
    result = await deleteAccount(user.uid);
  } catch {
    console.error('compte : suppression interrompue');
    return 'erreur';
  }
  if (result !== 'supprime') return result;
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/compte/supprime'); // hors du try : la redirection est une exception de Next
}
