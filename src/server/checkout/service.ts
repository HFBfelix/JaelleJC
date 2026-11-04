// Clic « Confirmer et payer » : le serveur relit panier, prix, stock et livraison, crée la session Stripe
// (prix relus en base, identifiant du panier en métadonnée), puis garde un instantané pour le webhook.
import 'server-only';
import { randomBytes } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { listAddresses, saveAddress } from '../account/addresses';
import { fullName, isProfileComplete } from '../account/greeting';
import { loadProfile } from '../account/profile';
import type { SessionUser } from '../auth/session';
import { accountKey, loadCart, readDeliveryRule } from '../cart/repository';
import { COLLECTIONS, checkoutSnapshot, type Adresse, type CheckoutSnapshot } from '../db/schema';
import { adminDb } from '../firebase/admin';
import { siteOrigin } from '../http/origin';
import { customerWithAddress } from '../payments/customers';
import { verifyAddress } from './address';
import { getStripe } from '../payments/stripe';
import {
  CHECKOUT_EXPIRES_SECONDS, amountsOf, isMetropolitanZip, normalizeGift, prepareLines, shippingOption, stripeLineItems, type ShippingInput,
} from './logic';

export type StartCheckoutResult =
  | { status: 'ok'; url: string }
  | { status: 'vide' | 'stock' | 'indisponible' | 'adresse' | 'profil' | 'metropole' };

// `forOther` : cadeau livré à une autre personne (nom et téléphone du destinataire saisis) ; sinon la livraison
// porte le nom et le téléphone du profil de la personne qui achète.
export async function startCheckout(
  user: SessionUser, gift: { wrap: boolean; message: string }, shipping: ShippingInput, save: boolean, forOther = false,
): Promise<StartCheckoutResult> {
  if (!user.email) return { status: 'indisponible' };
  // Coordonnées de la personne qui achète obligatoires (décision de Jaelle, 2026-11-04) : sans elles, aucun paiement.
  const profile = await loadProfile(user.uid);
  if (!isProfileComplete(profile)) return { status: 'profil' };
  const buyer = { name: fullName(profile), phone: profile.telephone };
  if (!forOther) shipping = { ...shipping, name: buyer.name, phone: buyer.phone };
  const key = accountKey(user.uid);
  const [{ items, offers, adjusted }, rule] = await Promise.all([loadCart(key), readDeliveryRule()]);
  // Panier corrigé en base par loadCart (pièce vendue ou retirée entre-temps) : la cliente est prévenue.
  if (adjusted) return { status: 'stock' };
  const prepared = prepareLines(items, offers);
  if (!prepared.ok) return { status: prepared.reason };
  if (!rule) return { status: 'indisponible' }; // livraison inconnue : aucun paiement

  // Adresse réelle exigée (Base Adresse Nationale) ; écriture officielle gardée (rue, code postal, ville).
  const checked = await verifyAddress(shipping);
  if (checked.status === 'introuvable') return { status: 'adresse' };
  if (checked.status === 'verifiee') shipping = { ...shipping, line1: checked.line1, zipCode: checked.zipCode, city: checked.city };
  if (!isMetropolitanZip(shipping.zipCode)) return { status: 'metropole' }; // écriture officielle relue aussi
  const address: Adresse = { label: '', ...shipping, country: 'FR' };
  // « Enregistrer cette adresse » : seulement à la demande, sans doublon ; plafond atteint = simplement non enregistrée.
  if (save) {
    const same = (await listAddresses(user.uid)).some((a) =>
      a.name === address.name && a.line1 === address.line1 && a.zipCode === address.zipCode && a.city === address.city);
    if (!same) await saveAddress(user.uid, undefined, { ...shipping, label: '' });
  }
  const amounts = amountsOf(prepared.lines, rule);
  const origin = await siteOrigin();
  const now = Math.floor(Date.now() / 1000);
  // Adresse vérifiée : portée par le client Stripe du compte et par le paiement. Stripe ne redemande pas la livraison
  // (la cliente la change sur la page panier) ; l'adresse de facturation de la carte reste libre chez Stripe.
  const customer = await customerWithAddress(user.uid, user.email, address);
  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    locale: 'fr',
    line_items: stripeLineItems(prepared.lines),
    shipping_options: [shippingOption(amounts.deliveryCents)],
    payment_intent_data: {
      shipping: {
        name: shipping.name, phone: shipping.phone,
        address: { line1: shipping.line1, line2: shipping.line2 || undefined, postal_code: shipping.zipCode, city: shipping.city, country: 'FR' },
      },
    },
    // Carte seulement (Apple Pay et Google Pay compris) : paiement confirmé tout de suite. Les moyens différés
    // (prélèvement…) arriveraient après la réservation du stock et l'expiration de l'instantané.
    payment_method_types: ['card'],
    customer,
    client_reference_id: user.uid,
    metadata: { cartId: key.id, uid: user.uid },
    expires_at: now + CHECKOUT_EXPIRES_SECONDS,
    success_url: `${origin}/commande/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/panier`,
  }, { idempotencyKey: `checkout-${user.uid}-${randomBytes(8).toString('hex')}` });
  if (!session.url || session.amount_total !== amounts.totalCents) throw new Error('Session Stripe inattendue.');

  const snapshot: CheckoutSnapshot = checkoutSnapshot.parse({
    uid: user.uid, email: user.email, cartId: key.id, lines: prepared.lines, amounts, gift: normalizeGift(gift),
    shipping: { name: shipping.name, line1: shipping.line1, line2: shipping.line2, zipCode: shipping.zipCode, city: shipping.city, phone: shipping.phone },
    buyer,
  });
  await adminDb().collection(COLLECTIONS.checkouts).doc(session.id).set({
    ...snapshot,
    createdAt: Timestamp.fromMillis(now * 1000),
    expiresAt: Timestamp.fromMillis((now + 7 * 24 * 3600) * 1000), // TTL : gardé une semaine (webhooks tardifs)
  });
  return { status: 'ok', url: session.url };
}
