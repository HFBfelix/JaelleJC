// Produits de l'espace créatrice (Admin SDK). Appelé uniquement par les Server Actions qui ont vérifié le droit
// admin. Toute écriture garde la trace de l'autrice (`updatedBy`) et les gestes sensibles vont dans `auditLog`.
import 'server-only';
import { randomUUID } from 'node:crypto';
import { FieldValue, Timestamp, type Transaction } from 'firebase-admin/firestore';
import { COLLECTIONS, categorie, variante, type Categorie, type Produit, type Variante } from '../db/schema';
import { adminDb } from '../firebase/admin';
import { deletePhotoFile, savePhoto } from '../firebase/storage';
import {
  PHOTOS_MAX, PHOTO_MAX_BYTES, canPublish, checklist, imageType, inStockOf, publishable, skuFor, slugify, variantIdFor,
  type ChecklistItem, type ProductFields, type VariantRow,
} from './logic';

const db = () => adminDb();
const products = () => db().collection(COLLECTIONS.produits);
const now = () => Timestamp.now();

export async function audit(uid: string, action: string, target: string, details: Record<string, unknown> = {}) {
  await db().collection(COLLECTIONS.auditLog).add({ who: uid, action, target, details, at: FieldValue.serverTimestamp() });
}

export async function listCategoriesAdmin(): Promise<{ slug: string; data: Categorie }[]> {
  const snap = await db().collection(COLLECTIONS.categories).get();
  return snap.docs
    .filter((d) => !d.get('migratedTo'))
    .flatMap((d) => {
      const parsed = categorie.safeParse(d.data());
      return parsed.success ? [{ slug: d.id, data: parsed.data }] : [];
    })
    .sort((a, b) => a.data.order - b.data.order);
}

// Fiche telle que l'espace créatrice la manipule : valeurs par défaut pour les champs absents (produits migrés).
export type AdminProduct = Omit<Produit, 'aiDraft'> & {
  id: string;
  publishedAt: string | null;
  aiDraft: { generatedAt: string | null; reviewed: boolean };
};
export type AdminVariant = Variante & { id: string };

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const iso = (v: unknown) => (v && typeof v === 'object' && 'toDate' in v ? (v as Timestamp).toDate().toISOString() : null);

export function toAdminProduct(id: string, d: Record<string, unknown>): AdminProduct {
  const images = Array.isArray(d.images) ? (d.images as Record<string, unknown>[]) : [];
  const ai = (d.aiDraft ?? {}) as Record<string, unknown>;
  const status = d.status === 'published' || d.status === 'archived' ? d.status : 'draft';
  return {
    id,
    slug: str(d.slug, id.toLowerCase()),
    name: str(d.name),
    categoryId: typeof d.categoryId === 'string' ? d.categoryId : null,
    subCategory: typeof d.subCategory === 'string' ? d.subCategory : null,
    status,
    accroche: str(d.accroche),
    histoire: str(d.histoire),
    description: str(d.description),
    materials: strs(d.materials),
    entretien: str(d.entretien),
    details: strs(d.details),
    faq: Array.isArray(d.faq) ? (d.faq as { question: string; reponse: string }[]).filter((f) => typeof f?.question === 'string') : [],
    images: images
      .map((i, n) => ({ path: str(i.path), url: str(i.url), alt: str(i.alt), order: Number.isInteger(i.order) ? (i.order as number) : n }))
      .sort((a, b) => a.order - b.order),
    priceCents: Number.isInteger(d.priceCents) ? (d.priceCents as number) : 0,
    limitedEditionSize: Number.isInteger(d.limitedEditionSize) ? (d.limitedEditionSize as number) : null,
    giftWrap: d.giftWrap !== false,
    tags: strs(d.tags),
    usages: strs(d.usages),
    inStock: d.inStock === true,
    publishedAt: iso(d.publishedAt),
    aiDraft: { generatedAt: iso(ai.generatedAt), reviewed: ai.reviewed === true },
  };
}

function toAdminVariants(docs: FirebaseFirestore.QueryDocumentSnapshot[]): AdminVariant[] {
  return docs.flatMap((v) => {
    const parsed = variante.safeParse(v.data());
    return parsed.success ? [{ id: v.id, ...parsed.data }] : [];
  }).sort((a, b) => a.order - b.order);
}

// Contrôle sur les valeurs du schéma public (dates en horodatage) à partir de la vue de l'espace créatrice.
const checklistOf = (p: AdminProduct, variants: Variante[], categories: { slug: string; data: Categorie }[]) =>
  checklist({ ...p, aiDraft: { generatedAt: p.aiDraft.generatedAt ? now() : null, reviewed: p.aiDraft.reviewed } }, variants, categories);

export type ProductRow = {
  id: string; name: string; status: AdminProduct['status']; priceCents: number; cover: string | null;
  categoryId: string | null; stock: number; missing: number;
};

export async function listProductsAdmin(): Promise<ProductRow[]> {
  const [snap, categories] = await Promise.all([products().get(), listCategoriesAdmin()]);
  return Promise.all(snap.docs.map(async (d) => {
    const p = toAdminProduct(d.id, d.data());
    const variants = toAdminVariants((await d.ref.collection(COLLECTIONS.variantes).get()).docs);
    return {
      id: d.id, name: p.name, status: p.status, priceCents: p.priceCents, cover: p.images[0]?.url ?? null, categoryId: p.categoryId,
      stock: variants.filter((v) => v.active).reduce((s, v) => s + v.stock, 0),
      missing: checklistOf(p, variants, categories).filter((i) => !i.ok).length,
    };
  })).then((rows) => rows.sort((a, b) => a.name.localeCompare(b.name, 'fr')));
}

export async function loadProductAdmin(id: string) {
  const ref = products().doc(id);
  const [snap, variantsSnap, categories] = await Promise.all([ref.get(), ref.collection(COLLECTIONS.variantes).get(), listCategoriesAdmin()]);
  if (!snap.exists) return null;
  const product = toAdminProduct(snap.id, snap.data()!);
  const variants = toAdminVariants(variantsSnap.docs);
  return { product, variants, categories, checklist: checklistOf(product, variants, categories) };
}

async function slugTaken(slug: string, exceptId: string | null) {
  const snap = await products().where('slug', '==', slug).limit(2).get();
  return snap.docs.some((d) => d.id !== exceptId);
}

async function uniqueSlug(base: string, exceptId: string | null) {
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? base : `${base.slice(0, 76)}-${n}`;
    if (!(await slugTaken(candidate, exceptId))) return candidate;
  }
  return `${base.slice(0, 70)}-${randomUUID().slice(0, 6)}`;
}

export async function createProduct(uid: string, name: string, from?: AdminProduct, fromVariants: AdminVariant[] = []): Promise<string> {
  const ref = products().doc();
  const slug = await uniqueSlug(slugify(name), null);
  const base: Record<string, unknown> = {
    slug, name, categoryId: null, subCategory: null, status: 'draft', accroche: '', histoire: '', description: '',
    materials: [], entretien: '', details: [], faq: [], images: [], priceCents: 0, limitedEditionSize: null, giftWrap: true,
    tags: [], usages: [], inStock: false, aiDraft: { generatedAt: null, reviewed: false },
  };
  // Duplication : textes, prix, matières et variantes repris ; ni photos (elles appartiennent à l'original), ni stock.
  if (from) {
    for (const k of ['categoryId', 'subCategory', 'accroche', 'histoire', 'description', 'materials', 'entretien', 'details', 'faq',
      'priceCents', 'limitedEditionSize', 'giftWrap', 'tags', 'usages'] as const) base[k] = from[k];
  }
  const batch = db().batch();
  batch.set(ref, { ...base, publishedAt: null, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), updatedBy: uid });
  fromVariants.forEach(({ id: vid, ...v }) => batch.set(ref.collection(COLLECTIONS.variantes).doc(vid), {
    ...v, sku: skuFor(slug, v.color ?? '', v.size ?? ''), stock: 0,
  }));
  if (!fromVariants.length) {
    batch.set(ref.collection(COLLECTIONS.variantes).doc('unique'), {
      sku: skuFor(slug, '', ''), color: null, size: null, priceCents: null, stock: 0, dimensions: null, active: true, order: 0,
    });
  }
  await batch.commit();
  await audit(uid, from ? 'produit.duplique' : 'produit.cree', ref.id, from ? { source: from.id } : {});
  return ref.id;
}

export type SaveResult = 'ok' | 'introuvable' | 'slug-pris' | 'incomplet';

// Enregistrement des champs. Un produit en ligne ne peut pas être enregistré dans un état incomplet
// (il disparaîtrait du site) : il faut d'abord le remettre en brouillon.
export async function saveFields(uid: string, id: string, fields: ProductFields): Promise<{ status: SaveResult; checklist?: ChecklistItem[] }> {
  const loaded = await loadProductAdmin(id);
  if (!loaded) return { status: 'introuvable' };
  const { product, variants, categories } = loaded;
  const { slug: wantedSlug, ...rest } = fields;
  let slug = product.slug;
  if (wantedSlug && wantedSlug !== product.slug) {
    if (product.publishedAt) return { status: 'incomplet' }; // slug figé après la première publication (adresses publiques)
    if (await slugTaken(wantedSlug, id)) return { status: 'slug-pris' };
    slug = wantedSlug;
  }
  const next: AdminProduct = { ...product, ...rest, slug };
  if (product.status === 'published') {
    const items = checklistOf(next, variants, categories);
    if (!canPublish(items) || !publishable(publicDoc(next, variants))) return { status: 'incomplet', checklist: items };
  }
  await products().doc(id).update({ ...rest, slug, updatedAt: FieldValue.serverTimestamp(), updatedBy: uid });
  if (product.status === 'published' && product.priceCents !== rest.priceCents) {
    await audit(uid, 'produit.prix', id, { avant: product.priceCents, apres: rest.priceCents });
  }
  return { status: 'ok', checklist: checklistOf(next, variants, categories) };
}

// Document tel que le site public le lira après publication.
function publicDoc(p: AdminProduct, variants: Variante[]) {
  const { aiDraft, ...fields } = p;
  const rest: Partial<AdminProduct> = { ...fields };
  delete rest.id;
  delete rest.publishedAt;
  return { ...rest, status: 'published', inStock: inStockOf(variants), aiDraft: { generatedAt: aiDraft.generatedAt ? now() : null, reviewed: aiDraft.reviewed } };
}

export type VariantsResult = { status: 'ok' } | { status: 'introuvable' | 'doublon' } | { status: 'stock-modifie'; variants: string[] };

// Variantes : stock tenu par variante, écrit en transaction. Une variante retirée de la grille est désactivée
// (jamais supprimée : paniers et commandes y font référence).
export async function saveVariants(uid: string, id: string, rows: VariantRow[]): Promise<VariantsResult> {
  const ref = products().doc(id);
  const result = await db().runTransaction(async (tx: Transaction): Promise<VariantsResult & { changes?: unknown[] }> => {
    const [snap, existingSnap] = await Promise.all([tx.get(ref), tx.get(ref.collection(COLLECTIONS.variantes))]);
    if (!snap.exists) return { status: 'introuvable' };
    const slug = str(snap.get('slug'), id);
    const existing = new Map(existingSnap.docs.map((d) => [d.id, d.data()]));
    const ids = rows.map((r) => r.id ?? variantIdFor(r.color, r.size));
    if (new Set(ids).size !== ids.length) return { status: 'doublon' };

    const conflicts = rows.flatMap((r, i) => {
      const current = existing.get(ids[i]!);
      const stock = Number.isInteger(current?.stock) ? (current!.stock as number) : null;
      return r.expectedStock !== stock && current ? [ids[i]!] : [];
    });
    if (conflicts.length) return { status: 'stock-modifie', variants: conflicts };

    const written: Variante[] = [];
    const changes: unknown[] = [];
    rows.forEach((r, i) => {
      const vid = ids[i]!;
      const before = existing.get(vid);
      const value: Variante = {
        sku: typeof before?.sku === 'string' && before.sku ? before.sku : skuFor(slug, r.color, r.size),
        color: r.color || null, size: r.size || null, priceCents: r.priceCents, stock: r.stock,
        dimensions: r.dimensions || null, active: r.active, order: i,
      };
      tx.set(ref.collection(COLLECTIONS.variantes).doc(vid), value);
      written.push(value);
      if (before?.stock !== r.stock) changes.push({ variante: vid, avant: before?.stock ?? null, apres: r.stock });
    });
    for (const [vid, data] of existing) {
      if (!ids.includes(vid) && data.active !== false) {
        tx.update(ref.collection(COLLECTIONS.variantes).doc(vid), { active: false });
        changes.push({ variante: vid, desactivee: true });
      }
    }
    tx.update(ref, { inStock: inStockOf(written), updatedAt: FieldValue.serverTimestamp(), updatedBy: uid });
    return { status: 'ok', changes };
  });
  if (result.status === 'ok' && result.changes?.length) await audit(uid, 'stock.modifie', id, { changes: result.changes });
  if (result.status === 'stock-modifie') return { status: 'stock-modifie', variants: result.variants };
  return { status: result.status } as VariantsResult;
}

export type PhotoResult = 'ok' | 'introuvable' | 'type' | 'taille' | 'plein' | 'derniere';

export async function addPhoto(uid: string, id: string, bytes: Uint8Array): Promise<PhotoResult> {
  if (bytes.byteLength > PHOTO_MAX_BYTES) return 'taille';
  const type = imageType(bytes);
  if (!type) return 'type';
  const ref = products().doc(id);
  const snap = await ref.get();
  if (!snap.exists) return 'introuvable';
  if ((toAdminProduct(id, snap.data()!).images.length) >= PHOTOS_MAX) return 'plein';
  // Nom aléatoire, jamais celui du fichier d'origine.
  const path = `produits/${id}/${randomUUID()}.${type}`;
  const url = await savePhoto(path, bytes, type === 'jpg' ? 'image/jpeg' : `image/${type}`);
  const added = await db().runTransaction(async (tx) => {
    const current = toAdminProduct(id, (await tx.get(ref)).data() ?? {});
    if (current.images.length >= PHOTOS_MAX) return false;
    tx.update(ref, { images: [...current.images, { path, url, alt: '', order: current.images.length }], updatedAt: FieldValue.serverTimestamp(), updatedBy: uid });
    return true;
  });
  if (!added) {
    await deletePhotoFile(path);
    return 'plein';
  }
  return 'ok';
}

// Ordre et textes alternatifs : la liste envoyée doit contenir exactement les photos existantes.
export async function updatePhotos(uid: string, id: string, images: { path: string; alt: string }[]): Promise<PhotoResult | 'incomplet'> {
  const ref = products().doc(id);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return 'introuvable';
    const current = toAdminProduct(id, snap.data()!);
    const byPath = new Map(current.images.map((i) => [i.path, i]));
    if (images.length !== current.images.length || images.some((i) => !byPath.has(i.path))) return 'introuvable';
    const next = images.map((i, order) => ({ ...byPath.get(i.path)!, alt: i.alt, order }));
    if (current.status === 'published' && next.some((i) => !i.alt.trim())) return 'incomplet';
    tx.update(ref, { images: next, updatedAt: FieldValue.serverTimestamp(), updatedBy: uid });
    return 'ok';
  });
}

export async function removePhoto(uid: string, id: string, path: string): Promise<PhotoResult> {
  const ref = products().doc(id);
  const result = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return 'introuvable' as const;
    const current = toAdminProduct(id, snap.data()!);
    if (!current.images.some((i) => i.path === path)) return 'introuvable' as const;
    if (current.status === 'published' && current.images.length === 1) return 'derniere' as const;
    const next = current.images.filter((i) => i.path !== path).map((i, order) => ({ ...i, order }));
    tx.update(ref, { images: next, updatedAt: FieldValue.serverTimestamp(), updatedBy: uid });
    return 'ok' as const;
  });
  if (result === 'ok' && path.startsWith(`produits/${id}/`)) await deletePhotoFile(path);
  return result;
}

export type StatusResult = { status: 'ok' | 'introuvable' | 'interdit' } | { status: 'incomplet'; checklist: ChecklistItem[] };

// Mise en ligne : liste de contrôle rejouée côté serveur, document conforme au schéma public.
export async function publishProduct(uid: string, id: string): Promise<StatusResult> {
  const loaded = await loadProductAdmin(id);
  if (!loaded) return { status: 'introuvable' };
  const { product, variants, checklist: items } = loaded;
  if (!canPublish(items) || !publishable(publicDoc(product, variants))) return { status: 'incomplet', checklist: items };
  await products().doc(id).update({
    status: 'published', inStock: inStockOf(variants),
    ...(product.publishedAt ? {} : { publishedAt: FieldValue.serverTimestamp() }),
    updatedAt: FieldValue.serverTimestamp(), updatedBy: uid,
  });
  await audit(uid, 'produit.publie', id);
  return { status: 'ok' };
}

export async function setProductStatus(uid: string, id: string, status: 'draft' | 'archived'): Promise<StatusResult> {
  const ref = products().doc(id);
  const snap = await ref.get();
  if (!snap.exists) return { status: 'introuvable' };
  await ref.update({ status, updatedAt: FieldValue.serverTimestamp(), updatedBy: uid });
  await audit(uid, status === 'archived' ? 'produit.archive' : 'produit.brouillon', id);
  return { status: 'ok' };
}

// Suppression définitive : seulement un brouillon jamais publié (donc jamais commandé).
export async function deleteDraft(uid: string, id: string): Promise<StatusResult> {
  const ref = products().doc(id);
  const snap = await ref.get();
  if (!snap.exists) return { status: 'introuvable' };
  const p = toAdminProduct(id, snap.data()!);
  if (p.status !== 'draft' || p.publishedAt || snap.get('legacy')) return { status: 'interdit' };
  const variants = await ref.collection(COLLECTIONS.variantes).get();
  const batch = db().batch();
  variants.docs.forEach((v) => batch.delete(v.ref));
  batch.delete(ref);
  await batch.commit();
  await Promise.all(p.images.filter((i) => i.path.startsWith(`produits/${id}/`)).map((i) => deletePhotoFile(i.path)));
  await audit(uid, 'produit.supprime', id);
  return { status: 'ok' };
}
