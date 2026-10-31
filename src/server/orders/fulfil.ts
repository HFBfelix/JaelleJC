// Création des commandes, UNIQUEMENT depuis le webhook Stripe (signature déjà vérifiée par la route).
// Une transaction : événement non encore traité → stock de chaque variante relu → décrément (tout ou rien) →
// commande créée (identifiant = session Stripe, donc jamais deux fois) → quantités retirées du panier.
// Stock insuffisant ou montant inattendu : commande « remboursée », remboursement Stripe automatique.
import 'server-only';
import { randomBytes } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { lineKey } from '../cart/logic';
import { cart as cartSchema, checkoutSnapshot, COLLECTIONS } from '../db/schema';
import { adminDb } from '../firebase/admin';
import { getStripe } from '../payments/stripe';
import {
  allocate, buildOrder, matchesSnapshot, orderReference, paidSession, paymentIntentId, withoutPurchased, type NewOrder,
} from '../checkout/logic';
import { notifyOrder } from './notify';

export type FulfilResult = 'cree' | 'rembourse' | 'deja-traite' | 'ignore';

export async function fulfilCheckout(rawSession: unknown, eventId: string, eventType: string): Promise<FulfilResult> {
  const session = paidSession.parse(rawSession);
  if (session.payment_status !== 'paid') return 'ignore'; // paiement différé : traité à « async_payment_succeeded »
  const db = adminDb();
  const orderRef = db.collection(COLLECTIONS.orders).doc(session.id);
  const eventRef = db.collection(COLLECTIONS.stripeEvents).doc(eventId);
  const snapRef = db.collection(COLLECTIONS.checkouts).doc(session.id);
  const now = new Date();

  const created = await db.runTransaction(async (tx) => {
    const [eventSnap, orderSnap, snapSnap] = await Promise.all([tx.get(eventRef), tx.get(orderRef), tx.get(snapRef)]);
    if (eventSnap.exists || orderSnap.exists) {
      if (!eventSnap.exists) tx.set(eventRef, { type: eventType, orderId: session.id, processedAt: Timestamp.fromDate(now) });
      return null;
    }
    // Instantané absent (supprimé, jamais écrit) : aucune commande inventée ; le paiement est remboursé
    // et l'anomalie gardée dans l'événement (jamais un paiement encaissé sans commande ni remboursement).
    const parsed = checkoutSnapshot.safeParse(snapSnap.data());
    if (!parsed.success) {
      tx.set(eventRef, { type: eventType, orderId: null, anomaly: 'instantane-absent', sessionId: session.id, processedAt: Timestamp.fromDate(now) });
      return 'sans-instantane' as const;
    }
    const snap = parsed.data;

    const variantRefs = snap.lines.map((l) =>
      db.collection(COLLECTIONS.produits).doc(l.productId).collection(COLLECTIONS.variantes).doc(l.variantId));
    const cartRef = db.collection(COLLECTIONS.carts).doc(snap.cartId);
    // Toutes les variantes des pièces achetées : l'indicateur « en stock » de chaque pièce est recalculé après le
    // décompte (dernière pièce vendue → épuisée partout sur le site, listes et données structurées comprises).
    const productIds = [...new Set(snap.lines.map((l) => l.productId))];
    const [variantSnaps, cartSnap, ...allVariants] = await Promise.all([
      tx.getAll(...variantRefs), tx.get(cartRef),
      ...productIds.map((id) => tx.get(db.collection(COLLECTIONS.produits).doc(id).collection(COLLECTIONS.variantes))),
    ]);
    const stocks = new Map(snap.lines.map((l, i) => {
      const stock = variantSnaps[i]?.get('stock');
      return [lineKey(l.productId, l.variantId), Number.isInteger(stock) ? (stock as number) : undefined] as const;
    }));

    const amountOk = matchesSnapshot(session, snap);
    const allocation = amountOk ? allocate(snap.lines, stocks) : { ok: false as const };
    const outcome = !amountOk ? 'montant' : allocation.ok ? 'paid' : 'stock';
    const order = buildOrder(session, snap, eventId, outcome, orderReference(now, randomBytes(4)));

    if (allocation.ok) {
      snap.lines.forEach((l, i) => {
        const key = lineKey(l.productId, l.variantId);
        tx.update(variantRefs[i]!, { stock: allocation.remaining.get(key), updatedAt: Timestamp.fromDate(now) });
      });
      productIds.forEach((id, n) => {
        const inStock = allVariants[n]!.docs.some((v) => {
          const remaining = allocation.remaining.get(lineKey(id, v.id));
          const stock = remaining ?? (Number.isInteger(v.get('stock')) ? (v.get('stock') as number) : 0);
          return v.get('active') === true && stock > 0;
        });
        tx.update(db.collection(COLLECTIONS.produits).doc(id), { inStock });
      });
      const cart = cartSchema.safeParse(cartSnap.data());
      if (cart.success) tx.update(cartRef, { items: withoutPurchased(cart.data.items, snap.lines), updatedAt: Timestamp.fromDate(now) });
    }
    tx.set(orderRef, { ...order, createdAt: Timestamp.fromDate(now) });
    tx.set(eventRef, { type: eventType, orderId: session.id, processedAt: Timestamp.fromDate(now) });
    tx.update(snapRef, { status: 'traite' });
    return order;
  });

  if (created === 'sans-instantane') {
    const id = await refund(session.id, paymentIntentId(session));
    await eventRef.update({ refundId: id });
    return 'rembourse';
  }
  if (!created) {
    // Essai précédent interrompu : remboursement ou e-mails restés en attente.
    const existing = (await orderRef.get()).data() as NewOrder | undefined;
    if (existing?.refund && !existing.refund.id && existing.stripe.paymentIntentId) {
      await orderRef.update({ 'refund.id': await refund(session.id, existing.stripe.paymentIntentId) });
    }
    if (existing) await notifyOrder(session.id, existing);
    return 'deja-traite';
  }
  if (created.refund) await orderRef.update({ 'refund.id': await refund(session.id, paymentIntentId(session)) });
  await notifyOrder(session.id, created);
  return created.refund ? 'rembourse' : 'cree';
}

// Remboursement total, idempotent côté Stripe (même clé) : un réessai ne rembourse jamais deux fois.
// Déjà remboursé (réessai après l'expiration de la clé d'idempotence) : considéré comme fait.
async function refund(sessionId: string, paymentIntent: string): Promise<string> {
  if (!paymentIntent) throw new Error('Remboursement impossible : paiement inconnu.');
  try {
    const result = await getStripe().refunds.create(
      { payment_intent: paymentIntent, reason: 'requested_by_customer', metadata: { sessionId } },
      { idempotencyKey: `refund-${sessionId}` },
    );
    return result.id;
  } catch (error) {
    if ((error as { code?: string }).code === 'charge_already_refunded') return 'deja-rembourse';
    throw error;
  }
}

// Session expirée sans paiement : instantané marqué s'il existe (la TTL le supprimera).
export async function expireCheckout(sessionId: string) {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return;
  const ref = adminDb().collection(COLLECTIONS.checkouts).doc(sessionId);
  await adminDb().runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) tx.update(ref, { status: 'expire', expiredAt: FieldValue.serverTimestamp() });
  });
}
