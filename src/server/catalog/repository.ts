// Lecture du catalogue publié (Admin SDK, serveur uniquement). Une seule lecture par requête
// grâce à `cache`. Le filtre `status == 'published'` est appliqué dans la requête ET vérifié au mappage.
import 'server-only';
import { cache } from 'react';
import { FieldPath } from 'firebase-admin/firestore';
import { adminDb } from '../firebase/admin';
import { isValidSlug, toCategoryView, toProductCard, toProductView } from './mapping';
import type { CategoryView, ProductCardView, ProductView } from './types';

export const listCategories = cache(async (): Promise<CategoryView[]> => {
  const snap = await adminDb().collection('categories').get();
  return snap.docs
    .filter((d) => !d.get('migratedTo')) // anciens documents conservés pendant la transition
    .map((d) => toCategoryView(d.id, d.data()))
    .filter((c): c is CategoryView => c !== null)
    .sort((a, b) => a.order - b.order);
});

// Lecture unique ; la date de création sert au tri côté serveur et n'est jamais transmise aux pages.
const loadPublished = cache(async () => {
  const [snap, categories] = await Promise.all([
    adminDb().collection('produits').where('status', '==', 'published').orderBy(FieldPath.documentId()).get(),
    listCategories(),
  ]);
  return snap.docs.flatMap((d) => {
    const card = toProductCard(d.id, d.data(), categories);
    const created = d.get('createdAt') as { toMillis?: () => number } | undefined;
    return card ? [{ card, createdAtMs: created?.toMillis?.() ?? 0 }] : [];
  });
});

// Ordre de l'ancien accueil : identifiant du document.
export const listPublishedProducts = cache(async (): Promise<ProductCardView[]> =>
  (await loadPublished()).map((p) => p.card));

// Ordre de l'ancienne page Collections : les plus récents d'abord.
export const listPublishedProductsNewestFirst = cache(async (): Promise<ProductCardView[]> =>
  [...(await loadPublished())].sort((a, b) => b.createdAtMs - a.createdAtMs).map((p) => p.card));

export const getProductBySlug = cache(async (slug: string): Promise<ProductView | null> => {
  if (!isValidSlug(slug)) return null; // adresse impossible : 404 sans interroger la base
  const snap = await adminDb().collection('produits')
    .where('slug', '==', slug).where('status', '==', 'published').limit(1).get();
  const doc = snap.docs[0];
  if (!doc) return null;
  const [variants, categories] = await Promise.all([doc.ref.collection('variantes').get(), listCategories()]);
  return toProductView(doc.id, doc.data(), variants.docs.map((v) => v.data()), categories);
});

// Anciennes adresses /product/<identifiant> : slug du produit publié, sinon null (404).
export async function getPublishedSlugById(id: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return null;
  const [doc, categories] = await Promise.all([adminDb().collection('produits').doc(id).get(), listCategories()]);
  // Même validation que la fiche : jamais de redirection vers une fiche qui n'existe pas pour le public.
  return doc.exists ? (toProductCard(doc.id, doc.data(), categories)?.slug ?? null) : null;
}

export async function listRelated(product: ProductView, count = 4): Promise<ProductCardView[]> {
  const all = await listPublishedProducts();
  return all.filter((p) => p.id !== product.id && p.categorySlug === product.categorySlug).slice(0, count);
}
