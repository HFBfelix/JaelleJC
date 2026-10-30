// Commandes de l'espace client, lues côté serveur pour la seule propriétaire. Ne crée ni ne modifie rien.
import 'server-only';
import { COLLECTIONS } from '../db/schema';
import { adminDb } from '../firebase/admin';
import { ORDER_ID, byNewest, orderDetail, type OrderDetail } from './view';

const MAX_ORDERS = 200;

// Filtre sur userId seulement (aucun index composé) ; tri en mémoire, une cliente a peu de commandes.
export async function ordersOf(uid: string): Promise<OrderDetail[]> {
  const snap = await adminDb().collection(COLLECTIONS.orders).where('userId', '==', uid).limit(MAX_ORDERS).get();
  return snap.docs.map((d) => orderDetail(d.id, d.data())).sort(byNewest);
}

// Commande d'une autre cliente ou inconnue : null, sans distinction (rien n'est révélé).
export async function orderOf(uid: string, id: unknown): Promise<OrderDetail | null> {
  if (typeof id !== 'string' || !ORDER_ID.test(id)) return null;
  const snap = await adminDb().collection(COLLECTIONS.orders).doc(id).get();
  if (!snap.exists || snap.get('userId') !== uid) return null;
  return orderDetail(snap.id, snap.data()!);
}
