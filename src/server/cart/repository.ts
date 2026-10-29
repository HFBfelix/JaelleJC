// Accès Firestore du panier (Admin SDK, serveur uniquement ; les règles refusent tout au navigateur).
// Chaque modification du contenu se fait en transaction sur le document panier, sans mélange entre deux onglets
// qui modifient le même panier en même temps.
import 'server-only';
import { Timestamp, type DocumentReference } from 'firebase-admin/firestore';
import { listCategories } from '../catalog/repository';
import { cart as cartSchema, COLLECTIONS, deliverySettings } from '../db/schema';
import { adminDb } from '../firebase/admin';
import { expiryFrom, isExpired, lineKey, mergeItems, normalize, shouldRenew, type DeliveryRule } from './logic';
import { toOffer } from './offers';
import type { CartItem, CartStatus, Offer } from './types';

type Target = { productId: string; variantId: string };
type StoredCart = { items: CartItem[]; updatedAt: Date };

// Panier visiteur (`carts/{empreinte du jeton}`) ou panier d'un compte (`carts/u_{uid}`).
export type CartKey = { id: string; tokenHash: string | null; userId: string | null };
export const guestKey = (tokenHash: string): CartKey => ({ id: tokenHash, tokenHash, userId: null });
export const accountKey = (uid: string): CartKey => ({ id: `u_${uid}`, tokenHash: null, userId: uid });

const cartRef = (key: CartKey) => adminDb().collection(COLLECTIONS.carts).doc(key.id);

// Identifiants venus du navigateur : validés par l'action (Zod) avant d'arriver ici.
// Lecture hors transaction : les documents de stock ne sont jamais verrouillés par un panier (le paiement, lui,
// revérifiera et décrémentera le stock en transaction). Le plafond affiché peut donc avoir une seconde de retard.
async function readOffers(targets: Target[]): Promise<Map<string, Offer>> {
  const unique = [...new Map(targets.map((t) => [lineKey(t.productId, t.variantId), t])).values()];
  const offers = new Map<string, Offer>();
  if (!unique.length) return offers;
  const db = adminDb();
  const productIds = [...new Set(unique.map((t) => t.productId))];
  const refs: DocumentReference[] = [
    ...productIds.map((id) => db.collection(COLLECTIONS.produits).doc(id)),
    ...unique.map((t) => db.collection(COLLECTIONS.produits).doc(t.productId).collection(COLLECTIONS.variantes).doc(t.variantId)),
  ];
  const [snaps, categories] = await Promise.all([db.getAll(...refs), listCategories()]);
  const products = new Map(snaps.slice(0, productIds.length).map((s) => [s.id, s.exists ? s.data() : undefined]));
  unique.forEach((t, i) => {
    const variantSnap = snaps[productIds.length + i]!;
    const offer = toOffer(t.productId, products.get(t.productId), t.variantId, variantSnap.exists ? variantSnap.data() : undefined, categories);
    if (offer) offers.set(lineKey(t.productId, t.variantId), offer);
  });
  return offers;
}

// Panier absent, illisible ou expiré : traité comme vide (le jeton n'ouvre plus rien).
function parseCart(data: unknown, now: Date): StoredCart | null {
  const parsed = cartSchema.safeParse(data);
  if (!parsed.success || isExpired(parsed.data.expiresAt.toDate(), now)) return null;
  return { items: parsed.data.items, updatedAt: parsed.data.updatedAt.toDate() };
}

function stored(key: CartKey, items: CartItem[], now: Date, isNew: boolean) {
  return {
    tokenHash: key.tokenHash,
    userId: key.userId,
    items,
    expiresAt: Timestamp.fromDate(expiryFrom(now)),
    updatedAt: Timestamp.fromDate(now),
    ...(isNew ? { createdAt: Timestamp.fromDate(now) } : {}),
  };
}

export async function readDeliveryRule(): Promise<DeliveryRule | null> {
  const snap = await adminDb().collection(COLLECTIONS.settings).doc('delivery').get();
  const parsed = deliverySettings.safeParse(snap.data());
  return parsed.success ? { freeThresholdCents: parsed.data.freeThresholdCents, flatRateCents: parsed.data.flatRateCents } : null;
}

// Lecture pour l'affichage. Une visite compte comme une activité : expiration renouvelée (au plus une fois par heure)
// et panier remis en accord avec la base (pièce retirée de la vente, stock réduit).
export async function loadCart(key: CartKey, now = new Date()) {
  const ref = cartRef(key);
  const current = parseCart((await ref.get()).data(), now);
  if (!current) return { items: [] as CartItem[], offers: new Map<string, Offer>(), adjusted: false };
  const offers = await readOffers(current.items);
  const { items, changed } = normalize(current.items, offers);
  if (changed) {
    // Correction écrite en transaction, sur le contenu relu : un ajout fait entre-temps n'est jamais écrasé.
    await adminDb().runTransaction(async (tx) => {
      const latest = parseCart((await tx.get(ref)).data(), now);
      if (latest) tx.set(ref, stored(key, normalize(latest.items, offers).items, now, false), { merge: true });
    });
  } else if (shouldRenew(current.updatedAt, now)) {
    // Simple renouvellement : seules les dates changent, jamais le contenu.
    await ref.update({ expiresAt: Timestamp.fromDate(expiryFrom(now)), updatedAt: Timestamp.fromDate(now) });
  }
  return { items, offers, adjusted: changed };
}

// Modification en transaction : `apply` reçoit le panier remis à jour et l'offre de la ligne visée.
// Un panier n'est créé en base que lorsqu'il contient au moins une pièce.
export async function changeCart(
  key: CartKey,
  target: Target,
  apply: (items: CartItem[], offer: Offer | undefined) => { items: CartItem[]; status: CartStatus },
) {
  const now = new Date();
  return adminDb().runTransaction(async (tx) => {
    const ref = cartRef(key);
    const snap = await tx.get(ref);
    const current = parseCart(snap.data(), now);
    const offers = await readOffers([...(current?.items ?? []), target]);
    const before = normalize(current?.items ?? [], offers);
    const result = apply(before.items, offers.get(lineKey(target.productId, target.variantId)));
    if (snap.exists || result.items.length) {
      tx.set(ref, stored(key, result.items, now, !snap.exists), { merge: true });
    }
    return { items: result.items, offers, status: result.status, adjusted: before.changed };
  });
}

// Connexion : le panier visiteur rejoint celui du compte, puis le document visiteur est supprimé
// (le jeton du cookie n'ouvre plus rien, même s'il avait été imposé par un tiers).
export async function mergeGuestCart(guest: CartKey, account: CartKey) {
  const now = new Date();
  await adminDb().runTransaction(async (tx) => {
    const guestRef = cartRef(guest);
    const accountRef = cartRef(account);
    const [guestSnap, accountSnap] = await Promise.all([tx.get(guestRef), tx.get(accountRef)]);
    const guestCart = parseCart(guestSnap.data(), now);
    const accountCart = parseCart(accountSnap.data(), now);
    if (guestSnap.exists) tx.delete(guestRef);
    if (!guestCart?.items.length) return;
    const offers = await readOffers([...(accountCart?.items ?? []), ...guestCart.items]);
    const items = mergeItems(accountCart?.items ?? [], guestCart.items, offers);
    tx.set(accountRef, stored(account, items, now, !accountSnap.exists), { merge: true });
  });
}
