'use server';

// Envois automatiques : lancement à la main et délai « colis arrivé ? » (Atelier, droit admin relu) ; lien
// « ne plus recevoir ces messages » (public, entrée validée, même réponse si le lien est faux).
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { requireAdmin } from '../auth/session';
import { COLLECTIONS } from '../db/schema';
import { adminDb } from '../firebase/admin';
import { siteOrigin } from '../http/origin';
import { runAutomations, type AutomationSummary } from './automations';
import { optOut } from './prefs';

export async function runAutomationsAction(): Promise<({ status: 'ok' } & AutomationSummary) | { status: 'connexion' | 'erreur' }> {
  if (!(await requireAdmin())) return { status: 'connexion' };
  try {
    return { status: 'ok', ...(await runAutomations(await siteOrigin())) };
  } catch {
    console.error('atelier : envois automatiques impossibles');
    return { status: 'erreur' };
  }
}

export async function saveArrivalDaysAction(input: unknown): Promise<{ status: 'ok' | 'connexion' | 'invalide' | 'erreur' }> {
  const admin = await requireAdmin();
  if (!admin) return { status: 'connexion' };
  const parsed = z.strictObject({ arrivalDays: z.number().int().min(1).max(30) }).safeParse(input);
  if (!parsed.success) return { status: 'invalide' };
  try {
    await adminDb().collection(COLLECTIONS.settings).doc('emails')
      .set({ arrivalDays: parsed.data.arrivalDays, updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.uid }, { merge: true });
    return { status: 'ok' };
  } catch {
    console.error('atelier : délai « colis arrivé » non enregistré');
    return { status: 'erreur' };
  }
}

export async function optOutAction(input: unknown): Promise<'ok' | 'erreur'> {
  const parsed = z.strictObject({ e: z.string().regex(/^[a-f0-9]{64}$/), t: z.string().regex(/^[a-f0-9]{48}$/) }).safeParse(input);
  if (!parsed.success) return 'ok';
  try {
    await optOut(parsed.data.e, parsed.data.t);
    return 'ok';
  } catch {
    console.error('e-mails : préférence non enregistrée');
    return 'erreur';
  }
}
