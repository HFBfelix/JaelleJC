'use server';

// Textes des e-mails (Atelier → Réglages) : enregistrement et retour au texte d'origine, droit admin relu à chaque
// action, saisie validée (Zod), mots entre accolades inconnus refusés.
import { z } from 'zod';
import { requireAdmin } from '../auth/session';
import { resetEmailText, saveEmailText } from './settings';
import { EMAIL_KINDS, emailTextInput, unknownVars } from './texts';

type Result = { status: 'ok' | 'connexion' | 'invalide' | 'erreur' } | { status: 'variables'; names: string[] };

export async function saveEmailTextAction(input: unknown): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { status: 'connexion' };
  const parsed = emailTextInput.safeParse(input);
  if (!parsed.success) return { status: 'invalide' };
  const names = unknownVars(parsed.data.kind, parsed.data.subject, parsed.data.title, parsed.data.body);
  if (names.length) return { status: 'variables', names };
  try {
    await saveEmailText(admin.uid, parsed.data);
    return { status: 'ok' };
  } catch {
    console.error('atelier : texte d’e-mail non enregistré');
    return { status: 'erreur' };
  }
}

export async function resetEmailTextAction(input: unknown): Promise<{ status: 'ok' | 'connexion' | 'invalide' | 'erreur' }> {
  const admin = await requireAdmin();
  if (!admin) return { status: 'connexion' };
  const parsed = z.strictObject({ kind: z.enum(EMAIL_KINDS) }).safeParse(input);
  if (!parsed.success) return { status: 'invalide' };
  try {
    await resetEmailText(admin.uid, parsed.data.kind);
    return { status: 'ok' };
  } catch {
    console.error('atelier : texte d’e-mail non rétabli');
    return { status: 'erreur' };
  }
}
