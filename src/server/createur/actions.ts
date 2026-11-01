'use server';

// Server Actions de l'espace créatrice (produits). Chacune : droit admin relu sur le compte (requireAdmin),
// entrée validée avec Zod, écriture par l'Admin SDK. Le navigateur n'écrit jamais dans `produits` ni `variantes`.
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '../auth/session';
import { analyzeProduct, type AnalyzeResult } from './ai';
import { NOTES_MAX } from './analysis';
import { photosInput, productFields, productId, variantsInput } from './logic';
import {
  audit, createProduct, deleteDraft, loadProductAdmin, publishProduct, removePhoto, saveFields, saveVariants,
  setProductStatus, updatePhotos, type PhotoResult, type SaveResult, type StatusResult, type VariantsResult,
} from './products';
import { adminDb } from '../firebase/admin';
import { COLLECTIONS } from '../db/schema';

type Denied = { status: 'connexion' | 'invalide' | 'erreur' };
const DENIED = { status: 'connexion' } as const;
const INVALID = { status: 'invalide' } as const;

async function run<T>(label: string, fn: (uid: string) => Promise<T>): Promise<T | Denied> {
  const admin = await requireAdmin();
  if (!admin) return DENIED;
  try {
    return await fn(admin.uid);
  } catch {
    console.error(`espace créatrice : ${label} impossible`); // aucun contenu saisi dans le journal
    return { status: 'erreur' };
  }
}

const byId = z.strictObject({ productId });

// Nouvelle pièce : le nom est facultatif (l'analyse IA le proposera à partir des notes et des photos).
export async function createProductAction(input: unknown): Promise<Denied> {
  const parsed = z.strictObject({ name: z.string().trim().max(120).optional() }).safeParse(input);
  if (!parsed.success) return INVALID;
  const result = await run('création', (uid) => createProduct(uid, parsed.data.name || 'Nouvelle pièce'));
  if (typeof result !== 'string') return result;
  redirect(`/atelier/produits/${result}`);
}

export async function duplicateProductAction(input: unknown): Promise<Denied | { status: 'introuvable' }> {
  const parsed = byId.safeParse(input);
  if (!parsed.success) return INVALID;
  const result = await run('duplication', async (uid) => {
    const loaded = await loadProductAdmin(parsed.data.productId);
    if (!loaded) return { status: 'introuvable' as const };
    return createProduct(uid, `${loaded.product.name} (copie)`, loaded.product, loaded.variants);
  });
  if (typeof result !== 'string') return result;
  redirect(`/atelier/produits/${result}`);
}

export async function saveFieldsAction(input: unknown) {
  const parsed = z.strictObject({ productId, fields: productFields }).safeParse(input);
  if (!parsed.success) return INVALID;
  return run<{ status: SaveResult; checklist?: unknown }>('enregistrement', (uid) => saveFields(uid, parsed.data.productId, parsed.data.fields));
}

export async function saveVariantsAction(input: unknown): Promise<VariantsResult | Denied> {
  const parsed = variantsInput.safeParse(input);
  if (!parsed.success) return INVALID;
  return run('variantes', (uid) => saveVariants(uid, parsed.data.productId, parsed.data.rows));
}

// Envoi de photo : route dédiée src/app/api/createur/photos (limite de corps propre).

export async function updatePhotosAction(input: unknown): Promise<{ status: PhotoResult | 'incomplet' } | Denied> {
  const parsed = photosInput.safeParse(input);
  if (!parsed.success) return INVALID;
  return run('photos', async (uid) => ({ status: await updatePhotos(uid, parsed.data.productId, parsed.data.images) }));
}

export async function removePhotoAction(input: unknown): Promise<{ status: PhotoResult } | Denied> {
  const parsed = z.strictObject({ productId, path: z.string().max(300) }).safeParse(input);
  if (!parsed.success) return INVALID;
  return run('suppression de photo', async (uid) => ({ status: await removePhoto(uid, parsed.data.productId, parsed.data.path) }));
}

export async function publishAction(input: unknown): Promise<StatusResult | Denied> {
  const parsed = byId.safeParse(input);
  if (!parsed.success) return INVALID;
  return run('publication', (uid) => publishProduct(uid, parsed.data.productId));
}

export async function setStatusAction(input: unknown): Promise<StatusResult | Denied> {
  const parsed = z.strictObject({ productId, status: z.enum(['draft', 'archived']) }).safeParse(input);
  if (!parsed.success) return INVALID;
  return run('changement de statut', (uid) => setProductStatus(uid, parsed.data.productId, parsed.data.status));
}

export async function deleteDraftAction(input: unknown): Promise<StatusResult | Denied> {
  const parsed = byId.safeParse(input);
  if (!parsed.success) return INVALID;
  const result = await run('suppression', (uid) => deleteDraft(uid, parsed.data.productId));
  if (result.status !== 'ok') return result;
  redirect('/atelier/produits');
}

// « Envoyer » : le texte libre (tapé ou dicté) et les photos partent à l'IA, qui propose de quoi préremplir la fiche.
export async function analyzeAction(input: unknown): Promise<AnalyzeResult | Denied> {
  const parsed = z.strictObject({ productId, notes: z.string().max(NOTES_MAX) }).safeParse(input);
  if (!parsed.success) return INVALID;
  return run('analyse IA', (uid) => analyzeProduct(uid, parsed.data.productId, parsed.data.notes));
}

// « J'ai vérifié les propositions de l'IA » : lève (ou remet) le blocage de publication.
export async function reviewAiAction(input: unknown): Promise<{ status: 'ok' | 'introuvable' } | Denied> {
  const parsed = z.strictObject({ productId, reviewed: z.boolean().default(true) }).safeParse(input);
  if (!parsed.success) return INVALID;
  return run('relecture IA', async (uid) => {
    const ref = adminDb().collection(COLLECTIONS.produits).doc(parsed.data.productId);
    if (!(await ref.get()).exists) return { status: 'introuvable' as const };
    await ref.update({ 'aiDraft.reviewed': parsed.data.reviewed, updatedBy: uid });
    await audit(uid, 'produit.ia-relu', parsed.data.productId);
    return { status: 'ok' as const };
  });
}
