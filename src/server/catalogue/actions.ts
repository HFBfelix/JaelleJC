'use server';

// Atelier, catalogue : « Rédiger avec l'IA ». Droit admin relu, entrée validée (identifiants des pièces cochées).
// Les textes reviennent sur la page pour être relus et corrigés ; rien n'est écrit en base.
import { requireAdmin } from '../auth/session';
import { textsInput } from './logic';
import { catalogueTexts, type TextsResult } from './service';

export async function catalogueTextsAction(input: unknown): Promise<TextsResult | { status: 'connexion' | 'invalide' | 'erreur' }> {
  const admin = await requireAdmin();
  if (!admin) return { status: 'connexion' };
  const parsed = textsInput.safeParse(input);
  if (!parsed.success) return { status: 'invalide' };
  try {
    return await catalogueTexts(admin.uid, parsed.data.ids);
  } catch {
    console.error('atelier : textes du catalogue impossibles');
    return { status: 'erreur' };
  }
}
