'use server';

// Server Actions de l'espace créatrice : catégories, réglages, messages et export. Droit admin relu à chaque appel.
import { z } from 'zod';
import { requireAdmin } from '../auth/session';
import {
  categoryInput, deliveryInput, listMessages, listNewsletter, markRead, saveCategory, saveDelivery, saveSite, siteInput, toCsv,
} from './site';

type Denied = { status: 'connexion' | 'invalide' | 'erreur' };

async function run<T>(label: string, fn: (uid: string) => Promise<T>): Promise<T | Denied> {
  const admin = await requireAdmin();
  if (!admin) return { status: 'connexion' };
  try {
    return await fn(admin.uid);
  } catch {
    console.error(`espace créatrice : ${label} impossible`);
    return { status: 'erreur' };
  }
}

export async function saveCategoryAction(input: unknown) {
  const parsed = categoryInput.safeParse(input);
  if (!parsed.success) return { status: 'invalide' as const };
  return run('catégorie', async (uid) => ({ status: await saveCategory(uid, parsed.data) }));
}

export async function saveDeliveryAction(input: unknown) {
  const parsed = deliveryInput.safeParse(input);
  if (!parsed.success) return { status: 'invalide' as const };
  return run('réglages de livraison', async (uid) => { await saveDelivery(uid, parsed.data); return { status: 'ok' as const }; });
}

export async function saveSiteAction(input: unknown) {
  const parsed = siteInput.safeParse(input);
  if (!parsed.success) return { status: 'invalide' as const };
  return run('informations de la maison', async (uid) => { await saveSite(uid, parsed.data); return { status: 'ok' as const }; });
}

export async function markReadAction(input: unknown) {
  const parsed = z.strictObject({ id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/) }).safeParse(input);
  if (!parsed.success) return { status: 'invalide' as const };
  return run('message lu', async () => ({ status: await markRead(parsed.data.id) }));
}

// Export rendu à la seule administratrice (fichier enregistré par son navigateur).
export async function exportAction(input: unknown) {
  const parsed = z.strictObject({ what: z.enum(['messages', 'newsletter']) }).safeParse(input);
  if (!parsed.success) return { status: 'invalide' as const };
  return run('export', async () => {
    const csv = parsed.data.what === 'messages'
      ? toCsv(await listMessages(), ['createdAt', 'name', 'email', 'subject', 'message', 'status'])
      : toCsv(await listNewsletter(), ['email', 'source', 'consentAt']);
    return { status: 'ok' as const, csv };
  });
}
