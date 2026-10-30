// Espace créatrice : tableau de bord « À faire », catégories, réglages (livraison, maison), messages et newsletter.
// Admin SDK ; appelé seulement par des Server Actions qui ont vérifié le droit admin.
import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { COLLECTIONS, categorie, deliverySettings } from '../db/schema';
import { adminDb } from '../firebase/admin';
import { slugify } from './logic';
import { audit, listCategoriesAdmin, listProductsAdmin } from './products';
import { listStocks } from './orders';

const db = () => adminDb();
const iso = (v: unknown) => (v && typeof v === 'object' && 'toDate' in v ? (v as { toDate(): Date }).toDate().toISOString() : null);

// --- Tableau de bord ---

export async function todo() {
  const [orders, products, stocks, unread] = await Promise.all([
    db().collection(COLLECTIONS.orders).where('status', 'in', ['paid', 'preparing']).get(),
    listProductsAdmin(),
    listStocks(),
    db().collection(COLLECTIONS.contacts).where('status', '==', 'unread').get(),
  ]);
  return {
    toShip: orders.size,
    drafts: products.filter((p) => p.status === 'draft').length,
    incomplete: products.filter((p) => p.status !== 'archived' && p.missing > 0).length,
    lowStock: stocks.filter((s) => s.status === 'published' && s.active && s.stock <= 1).length,
    unread: unread.size,
  };
}

// --- Catégories : slugs figés (produits et adresses publiques y font référence) ---

const text = (max: number) => z.string().trim().max(max);
export const categoryInput = z.strictObject({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80).optional(), // absent : nouvelle catégorie
  name: text(60).min(1),
  order: z.number().int().min(0).max(999),
  intro: text(1000),
  subs: z.array(z.strictObject({ slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80).optional(), name: text(60).min(1) })).max(20),
});

export async function saveCategory(uid: string, input: z.infer<typeof categoryInput>): Promise<'ok' | 'introuvable' | 'doublon'> {
  const col = db().collection(COLLECTIONS.categories);
  const slug = input.slug ?? slugify(input.name);
  const ref = col.doc(slug);
  const subs = input.subs.map((s) => ({ slug: s.slug ?? slugify(s.name), name: s.name }));
  if (new Set(subs.map((s) => s.slug)).size !== subs.length) return 'doublon';
  const value = categorie.parse({ name: input.name, order: input.order, intro: input.intro, subs });
  const result = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (input.slug && !snap.exists) return 'introuvable' as const;
    if (!input.slug && snap.exists) return 'doublon' as const;
    // Une famille déjà utilisée par une pièce ne disparaît pas.
    const before = (snap.get('subs') as { slug: string }[] | undefined) ?? [];
    const removed = before.filter((s) => !subs.some((n) => n.slug === s.slug)).map((s) => s.slug);
    if (removed.length) {
      const used = await tx.get(db().collection(COLLECTIONS.produits).where('categoryId', '==', slug).where('subCategory', 'in', removed.slice(0, 10)).limit(1));
      if (!used.empty) return 'doublon' as const;
    }
    tx.set(ref, value);
    return 'ok' as const;
  });
  if (result === 'ok') await audit(uid, 'categorie.modifiee', slug);
  return result;
}

// --- Réglages ---

export const deliveryInput = z.strictObject({
  freeThresholdCents: z.number().int().min(0).max(1_000_000),
  flatRateCents: z.number().int().min(0).max(10_000),
  zones: z.array(text(40).min(1)).min(1).max(10),
  estimatedDays: text(40),
});
export const siteInput = z.strictObject({
  legalName: text(120), address: text(300), email: z.union([z.literal(''), z.string().trim().email().max(254)]),
  instagram: z.union([z.literal(''), z.string().trim().url().max(200).refine((u) => u.startsWith('https://www.instagram.com/'))]),
});

export async function readSettings() {
  const [delivery, site] = await Promise.all([
    db().collection(COLLECTIONS.settings).doc('delivery').get(),
    db().collection(COLLECTIONS.settings).doc('site').get(),
  ]);
  const d = deliverySettings.safeParse(delivery.data());
  const s = siteInput.safeParse(site.data() ? { legalName: '', address: '', email: '', instagram: '', ...site.data() } : undefined);
  return {
    delivery: d.success ? d.data : { freeThresholdCents: 0, flatRateCents: 0, zones: ['France'], estimatedDays: '' },
    site: s.success ? s.data : { legalName: '', address: '', email: '', instagram: '' },
  };
}

// Le tarif de livraison entre dans le montant payé : chaque changement est journalisé.
export async function saveDelivery(uid: string, input: z.infer<typeof deliveryInput>) {
  const ref = db().collection(COLLECTIONS.settings).doc('delivery');
  const before = (await ref.get()).data() ?? null;
  await ref.set(deliverySettings.parse(input));
  await audit(uid, 'reglages.livraison', 'delivery', { avant: before, apres: input });
}

export async function saveSite(uid: string, input: z.infer<typeof siteInput>) {
  await db().collection(COLLECTIONS.settings).doc('site').set(input);
  await audit(uid, 'reglages.maison', 'site');
}

// --- Messages et newsletter ---

export async function listMessages() {
  const snap = await db().collection(COLLECTIONS.contacts).get();
  return snap.docs.map((d) => ({
    id: d.id, name: String(d.get('name') ?? ''), email: String(d.get('email') ?? ''), subject: String(d.get('subject') ?? ''),
    message: String(d.get('message') ?? ''), status: d.get('status') === 'read' ? 'read' : 'unread', createdAt: iso(d.get('createdAt')),
  })).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

export async function markRead(id: string): Promise<'ok' | 'introuvable'> {
  const ref = db().collection(COLLECTIONS.contacts).doc(id);
  if (!(await ref.get()).exists) return 'introuvable';
  await ref.update({ status: 'read', readAt: FieldValue.serverTimestamp() });
  return 'ok';
}

export async function listNewsletter() {
  const snap = await db().collection(COLLECTIONS.newsletter).get();
  return snap.docs.map((d) => ({ email: String(d.get('email') ?? ''), source: String(d.get('source') ?? ''), consentAt: iso(d.get('consentAt') ?? d.get('createdAt')) }))
    .sort((a, b) => (b.consentAt ?? '').localeCompare(a.consentAt ?? ''));
}

// Export CSV (séparateur « ; » pour Excel en français). Une cellule qui commence par = + - @ est neutralisée
// (injection de formule dans le tableur).
export function toCsv(rows: Record<string, string | null>[], columns: string[]): string {
  const cell = (v: string | null) => {
    const s = (v ?? '').replace(/\r?\n/g, ' ');
    const safe = /^[=+\-@\t]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return [columns.join(';'), ...rows.map((r) => columns.map((c) => cell(r[c] ?? '')).join(';'))].join('\r\n');
}

export { listCategoriesAdmin };
