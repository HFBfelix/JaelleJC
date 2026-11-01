// Commandes et stocks dans l'espace créatrice (Admin SDK). Appelé seulement par des Server Actions qui ont vérifié
// le droit admin. Une commande n'est jamais créée ici (webhook Stripe seulement) : on fait avancer son statut.
import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { COLLECTIONS, variante } from '../db/schema';
import { adminDb } from '../firebase/admin';
import { byNewest, orderDetail, type OrderDetail } from '../orders/view';
import { inStockOf } from './logic';
import { audit } from './products';

const db = () => adminDb();

export type AdminOrder = OrderDetail & { customerEmail: string; customerPhone: string; legacy: boolean; emails: { label: string; sent: boolean }[]; isNew: boolean };

// État des e-mails d'une commande, pour la fiche de l'espace créatrice (renvoi possible de ce qui est en attente).
export const EMAIL_LABELS = { cliente: 'Confirmation', boutique: 'Alerte boutique', preparation: 'En préparation', expedition: 'Colis en route' } as const;
export function emailStates(emails: unknown): { label: string; sent: boolean }[] {
  const e = (emails && typeof emails === 'object' ? emails : {}) as Record<string, unknown>;
  return (Object.keys(EMAIL_LABELS) as (keyof typeof EMAIL_LABELS)[])
    .filter((k) => e[k] === 'envoye' || e[k] === 'en_attente')
    .map((k) => ({ label: EMAIL_LABELS[k], sent: e[k] === 'envoye' }));
}

export async function listOrdersAdmin(): Promise<AdminOrder[]> {
  // Sans orderBy : les commandes migrées sans date resteraient invisibles. Petite boutique : tout est lu, trié ici.
  const snap = await db().collection(COLLECTIONS.orders).get();
  return snap.docs.map((d) => toAdminOrder(d.id, d.data())).sort(byNewest);
}

function toAdminOrder(id: string, d: Record<string, unknown>): AdminOrder {
  const detail = orderDetail(id, d);
  return {
    ...detail, customerEmail: detail.contact.email, customerPhone: detail.contact.phone, legacy: !!d.legacy,
    emails: d.reference ? emailStates(d.emails) : [], isNew: isNew(d),
  };
}

export async function orderAdmin(id: string): Promise<AdminOrder | null> {
  const snap = await db().collection(COLLECTIONS.orders).doc(id).get();
  return snap.exists ? toAdminOrder(id, snap.data()!) : null;
}

// Nouvelle commande : payée, jamais ouverte dans l'Atelier (cloche rouge de l'onglet « Commandes »).
// Seules les commandes de la refonte comptent (les commandes migrées de l'ancien site n'ont pas de référence).
export const isNew = (d: Record<string, unknown>) => d.status === 'paid' && !!d.reference && !d.seenAt;

export async function countNewOrders(): Promise<number> {
  const snap = await db().collection(COLLECTIONS.orders).where('status', '==', 'paid').get();
  return snap.docs.filter((d) => isNew(d.data())).length;
}

// Première ouverture de la fiche d'une commande : elle n'est plus « nouvelle ».
export async function markOrderSeen(id: string) {
  await db().collection(COLLECTIONS.orders).doc(id).update({ seenAt: FieldValue.serverTimestamp() });
}

// Expédition : transporteur et numéro de suivi saisis par Jaelle (Colissimo surtout, sans lien avec La Poste).
export const CARRIERS = { colissimo: 'Colissimo', lettre_suivie: 'Lettre suivie', autre: 'Autre transporteur' } as const;
export const shipInput = z.strictObject({
  orderId: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/),
  carrier: z.enum(['colissimo', 'lettre_suivie', 'autre']),
  number: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{8,24}$/),
  url: z.string().trim().max(300).url().refine((u) => u.startsWith('https://')).optional(),
});

export const trackingUrl = (carrier: keyof typeof CARRIERS, number: string, url?: string) =>
  carrier === 'autre' ? (url ?? '') : `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(number)}`;

// Statuts permis à partir de chaque statut (aucun retour en arrière, aucun « remboursé » ici : Stripe).
const NEXT: Record<string, string[]> = { paid: ['preparing', 'shipped'], preparing: ['shipped'], shipped: ['delivered'] };
export const canMove = (from: string, to: string) => NEXT[from]?.includes(to) ?? false;

export type OrderMoveResult = 'ok' | 'introuvable' | 'statut';

export async function moveOrder(
  uid: string, orderId: string, to: 'preparing' | 'shipped' | 'delivered',
  tracking?: { carrier: keyof typeof CARRIERS; number: string; url?: string },
): Promise<OrderMoveResult> {
  const ref = db().collection(COLLECTIONS.orders).doc(orderId);
  const result = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return 'introuvable' as const;
    if (!canMove(String(snap.get('status')), to)) return 'statut' as const;
    tx.update(ref, {
      status: to,
      [`${to}At`]: FieldValue.serverTimestamp(),
      // E-mails à la cliente : « en préparation », puis « colis en route » (envoyés juste après, voir notify.ts).
      ...(to === 'preparing' ? { 'emails.preparation': 'en_attente' } : {}),
      ...(to === 'shipped' && tracking
        ? {
            tracking: { carrier: CARRIERS[tracking.carrier], number: tracking.number, url: trackingUrl(tracking.carrier, tracking.number, tracking.url) },
            'emails.expedition': 'en_attente',
          }
        : {}),
    });
    return 'ok' as const;
  });
  if (result === 'ok') await audit(uid, `commande.${to}`, orderId);
  return result;
}

// --- Stocks : toutes les variantes, modifiables en ligne ---

export type StockRow = { productId: string; productName: string; status: string; variantId: string; label: string; sku: string; stock: number; active: boolean };

export async function listStocks(): Promise<StockRow[]> {
  const products = await db().collection(COLLECTIONS.produits).get();
  const rows = await Promise.all(products.docs.map(async (p) => {
    const variants = await p.ref.collection(COLLECTIONS.variantes).get();
    return variants.docs.flatMap((v) => {
      const parsed = variante.safeParse(v.data());
      if (!parsed.success) return [];
      return [{
        productId: p.id, productName: String(p.get('name') ?? ''), status: String(p.get('status') ?? 'draft'), variantId: v.id,
        label: [parsed.data.color, parsed.data.size].filter(Boolean).join(' · ') || 'Unique', sku: parsed.data.sku,
        stock: parsed.data.stock, active: parsed.data.active,
      }];
    });
  }));
  return rows.flat().sort((a, b) => a.productName.localeCompare(b.productName, 'fr') || a.label.localeCompare(b.label, 'fr'));
}

export const stockInput = z.strictObject({
  productId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  variantId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  stock: z.number().int().min(0).max(9999),
  expectedStock: z.number().int().min(0),
});

// Même protection que la fiche : si une vente a changé le stock depuis l'affichage, rien n'est écrasé.
export async function setStock(uid: string, input: z.infer<typeof stockInput>): Promise<'ok' | 'introuvable' | 'stock-modifie'> {
  const productRef = db().collection(COLLECTIONS.produits).doc(input.productId);
  const result = await db().runTransaction(async (tx) => {
    const [product, variants] = await Promise.all([tx.get(productRef), tx.get(productRef.collection(COLLECTIONS.variantes))]);
    const target = variants.docs.find((v) => v.id === input.variantId);
    if (!product.exists || !target) return 'introuvable' as const;
    if (target.get('stock') !== input.expectedStock) return 'stock-modifie' as const;
    tx.update(target.ref, { stock: input.stock });
    const all = variants.docs.map((v) => ({ active: v.get('active') === true, stock: v.id === input.variantId ? input.stock : Number(v.get('stock')) || 0 }));
    tx.update(productRef, { inStock: inStockOf(all), updatedAt: FieldValue.serverTimestamp(), updatedBy: uid });
    return 'ok' as const;
  });
  if (result === 'ok') {
    await audit(uid, 'stock.modifie', input.productId, { changes: [{ variante: input.variantId, avant: input.expectedStock, apres: input.stock }] });
  }
  return result;
}
