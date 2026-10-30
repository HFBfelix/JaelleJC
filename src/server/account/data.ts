// Droits RGPD depuis le compte : export des données et suppression du compte. Serveur uniquement (Admin SDK).
import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { accountKey } from '../cart/repository';
import { CHECKOUT_EXPIRES_SECONDS } from '../checkout/logic';
import { COLLECTIONS } from '../db/schema';
import { adminAuth, adminDb } from '../firebase/admin';
import { ordersOf } from '../orders/history';
import { deleteCustomer } from '../payments/customers';
import { listAddresses } from './addresses';
import { deletionBlocker, withoutId } from './logic';

const iso = (v: unknown) =>
  v && typeof v === 'object' && 'toDate' in v && typeof v.toDate === 'function' ? (v.toDate() as Date).toISOString() : null;

// Tout ce que la boutique garde sur la cliente, lisible (JSON). Identifiants techniques internes exclus.
export async function exportData(uid: string, email: string | null) {
  const db = adminDb();
  const byEmail = (col: string) => (email ? db.collection(col).where('email', '==', email.toLowerCase()).limit(200).get() : null);
  const [account, profile, addresses, orders, contacts, newsletter] = await Promise.all([
    adminAuth().getUser(uid),
    db.collection(COLLECTIONS.users).doc(uid).get(),
    listAddresses(uid),
    ordersOf(uid),
    byEmail(COLLECTIONS.contacts),
    byEmail(COLLECTIONS.newsletter),
  ]);
  return {
    exporteLe: new Date().toISOString(),
    compte: { email: account.email ?? null, creeLe: account.metadata.creationTime ?? null, derniereConnexion: account.metadata.lastSignInTime ?? null },
    profil: profile.exists
      ? { nom: profile.get('displayName') ?? '', telephone: profile.get('phone') ?? '', creeLe: iso(profile.get('createdAt')) }
      : null,
    adresses: addresses.map(withoutId),
    commandes: orders.map((o) => ({ ...o, createdAt: o.createdAt?.toISOString() ?? null })),
    messages: (contacts?.docs ?? []).map((d) => ({
      sujet: d.get('subject') ?? '', message: d.get('message') ?? '', envoyeLe: iso(d.get('createdAt')),
    })),
    newsletter: (newsletter?.docs ?? []).map((d) => ({ email: d.get('email'), inscritLe: iso(d.get('consentAt') ?? d.get('createdAt')) })),
  };
}

export type DeleteResult = 'supprime' | 'commande-en-cours' | 'paiement-en-cours';

// Suppression du compte. Refusée tant qu'une commande est en cours ou qu'un paiement peut encore aboutir.
// Supprimés : client Stripe, adresses, profil, panier du compte, puis le compte lui-même (sessions comprises).
// Gardées : les commandes (obligation comptable de 10 ans), détachées du compte : plus aucun lien vers lui.
export async function deleteAccount(uid: string): Promise<DeleteResult> {
  const db = adminDb();
  const [orders, checkouts] = await Promise.all([
    db.collection(COLLECTIONS.orders).where('userId', '==', uid).limit(200).get(),
    db.collection(COLLECTIONS.checkouts).where('uid', '==', uid).limit(200).get(),
  ]);
  const blocker = deletionBlocker(
    orders.docs.map((d) => d.get('status')),
    checkouts.docs.map((d) => ({ status: d.get('status'), createdAtMs: d.get('createdAt')?.toMillis?.() ?? null })),
    CHECKOUT_EXPIRES_SECONDS,
  );
  if (blocker) return blocker;

  await deleteCustomer(uid); // d'abord : en cas d'échec chez Stripe, rien n'est encore effacé
  const userRef = db.collection(COLLECTIONS.users).doc(uid);
  // Écritures en lots successifs (aucune limite au nombre d'adresses) : rejouable après un échec partiel.
  // Le compte n'est supprimé que si toutes les écritures ont réussi.
  const writer = db.bulkWriter();
  let failed = false;
  const track = (op: Promise<unknown>) => { op.catch(() => { failed = true; }); };
  for (const d of (await userRef.collection(COLLECTIONS.adresses).get()).docs) track(writer.delete(d.ref));
  track(writer.delete(userRef));
  track(writer.delete(db.collection(COLLECTIONS.carts).doc(accountKey(uid).id)));
  // Seuls les paiements traités ou expirés sont effacés : un paiement dont le webhook arrive en retard
  // retrouve son instantané (sinon il serait remboursé sans explication). TTL d'une semaine pour les autres.
  for (const d of checkouts.docs) if (['traite', 'expire'].includes(d.get('status'))) track(writer.delete(d.ref));
  for (const d of orders.docs) {
    track(writer.update(d.ref, { userId: null, 'customer.uid': null, 'legacy.userId': FieldValue.delete(), detachedAt: FieldValue.serverTimestamp() }));
  }
  await writer.close();
  if (failed) throw new Error('Suppression incomplète.');
  await adminAuth().deleteUser(uid);
  // Paiement lancé pendant la suppression (même cliente, autre onglet) : client Stripe recréé, effacé ici.
  await deleteCustomer(uid);
  return 'supprime';
}
