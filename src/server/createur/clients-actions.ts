'use server';

// Atelier, onglet Clientes : suppression d'un compte (décision de Jaelle, 2026-11-05). Droit admin relu sur le compte,
// connexion de l'administratrice de moins de 10 minutes, mot « SUPPRIMER » revérifié, 10 suppressions par heure au plus.
import { SENSITIVE_ACTION_SECONDS, isRecent } from '../auth/policy';
import { requireAdmin } from '../auth/session';
import { takeRateLimit } from '../http/rate-limit';
import { ADMIN_DELETIONS_PER_HOUR, deleteClientInput } from './clients-logic';
import { deleteClient, type DeleteClientResult } from './clients';

export type DeleteClientActionResult = DeleteClientResult | 'connexion' | 'reconnexion' | 'invalide' | 'limite' | 'erreur';

export async function deleteClientAction(input: unknown): Promise<DeleteClientActionResult> {
  const admin = await requireAdmin();
  if (!admin) return 'connexion';
  const parsed = deleteClientInput.safeParse(input);
  if (!parsed.success) return 'invalide';
  if (!isRecent(admin.authTime, SENSITIVE_ACTION_SECONDS)) return 'reconnexion';
  try {
    if (!(await takeRateLimit('suppression-cliente', admin.uid, ADMIN_DELETIONS_PER_HOUR, 3600_000))) return 'limite';
    return await deleteClient(admin.uid, parsed.data.uid);
  } catch {
    console.error('atelier : suppression de compte interrompue'); // ni e-mail ni identifiant dans le journal
    return 'erreur';
  }
}
