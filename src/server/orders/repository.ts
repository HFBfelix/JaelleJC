// Lecture d'une commande par sa propriétaire (page de confirmation). Ne crée ni ne modifie rien.
import 'server-only';
import { COLLECTIONS } from '../db/schema';
import { adminDb } from '../firebase/admin';
import type { NewOrder } from '../checkout/logic';

export type OrderView = Pick<NewOrder, 'reference' | 'items' | 'amounts' | 'gift' | 'status' | 'refund'>;
export type ConfirmationState = { state: 'commande'; order: OrderView } | { state: 'en-cours' } | { state: 'introuvable' };

const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

export async function confirmationFor(sessionId: unknown, uid: string): Promise<ConfirmationState> {
  if (typeof sessionId !== 'string' || !SESSION_ID.test(sessionId)) return { state: 'introuvable' };
  const db = adminDb();
  const [orderSnap, checkoutSnap] = await Promise.all([
    db.collection(COLLECTIONS.orders).doc(sessionId).get(),
    db.collection(COLLECTIONS.checkouts).doc(sessionId).get(),
  ]);
  if (orderSnap.exists) {
    const o = orderSnap.data() as NewOrder;
    if (o.userId !== uid) return { state: 'introuvable' }; // commande d'une autre cliente : rien n'est révélé
    return {
      state: 'commande',
      order: { reference: o.reference, items: o.items, amounts: o.amounts, gift: o.gift, status: o.status, refund: o.refund ?? null },
    };
  }
  // Webhook pas encore reçu : en cours (propriétaire du paiement seulement, session non expirée).
  const pending = checkoutSnap.exists && checkoutSnap.get('uid') === uid && checkoutSnap.get('status') !== 'expire';
  return pending ? { state: 'en-cours' } : { state: 'introuvable' };
}
