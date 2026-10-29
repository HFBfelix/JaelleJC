// Clic « Confirmer et payer » : le serveur relit panier, prix, stock et livraison, crée la session Stripe
// (prix relus en base, identifiant du panier en métadonnée), puis garde un instantané pour le webhook.
import 'server-only';
import { randomBytes } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { headers } from 'next/headers';
import type { SessionUser } from '../auth/session';
import { accountKey, loadCart, readDeliveryRule } from '../cart/repository';
import { COLLECTIONS, checkoutSnapshot, type CheckoutSnapshot } from '../db/schema';
import { adminDb } from '../firebase/admin';
import { getStripe } from '../payments/stripe';
import {
  CHECKOUT_EXPIRES_SECONDS, amountsOf, normalizeGift, prepareLines, shippingOption, stripeLineItems,
} from './logic';

export type StartCheckoutResult =
  | { status: 'ok'; url: string }
  | { status: 'vide' | 'stock' | 'indisponible' };

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const env = (name: string) => process.env[name]?.trim() || null;

// Adresse de retour après Stripe : jamais déduite de la requête en ligne. Production : NEXT_PUBLIC_SITE_URL ;
// aperçu Vercel : son adresse (VERCEL_URL) ; poste local : l'hôte local de la requête.
async function siteOrigin() {
  if (env('VERCEL_ENV') === 'production') return env('NEXT_PUBLIC_SITE_URL') ?? 'https://www.jaellejc.com';
  const preview = env('VERCEL_URL');
  if (preview) return `https://${preview}`;
  const host = (await headers()).get('host') ?? '';
  if (!LOCAL_HOST.test(host)) throw new Error('Adresse du site inconnue.');
  return `http://${host}`;
}

export async function startCheckout(user: SessionUser, gift: { wrap: boolean; message: string }): Promise<StartCheckoutResult> {
  if (!user.email) return { status: 'indisponible' };
  const key = accountKey(user.uid);
  const [{ items, offers, adjusted }, rule] = await Promise.all([loadCart(key), readDeliveryRule()]);
  // Panier corrigé en base par loadCart (pièce vendue ou retirée entre-temps) : la cliente est prévenue.
  if (adjusted) return { status: 'stock' };
  const prepared = prepareLines(items, offers);
  if (!prepared.ok) return { status: prepared.reason };
  if (!rule) return { status: 'indisponible' }; // livraison inconnue : aucun paiement

  const amounts = amountsOf(prepared.lines, rule);
  const origin = await siteOrigin();
  const now = Math.floor(Date.now() / 1000);
  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    locale: 'fr',
    line_items: stripeLineItems(prepared.lines),
    shipping_address_collection: { allowed_countries: ['FR'] },
    shipping_options: [shippingOption(amounts.deliveryCents)],
    phone_number_collection: { enabled: true },
    // Carte seulement (Apple Pay et Google Pay compris) : paiement confirmé tout de suite. Les moyens différés
    // (prélèvement…) arriveraient après la réservation du stock et l'expiration de l'instantané.
    payment_method_types: ['card'],
    customer_email: user.email,
    client_reference_id: user.uid,
    metadata: { cartId: key.id, uid: user.uid },
    expires_at: now + CHECKOUT_EXPIRES_SECONDS,
    success_url: `${origin}/commande/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/panier`,
  }, { idempotencyKey: `checkout-${user.uid}-${randomBytes(8).toString('hex')}` });
  if (!session.url || session.amount_total !== amounts.totalCents) throw new Error('Session Stripe inattendue.');

  const snapshot: CheckoutSnapshot = checkoutSnapshot.parse({
    uid: user.uid, email: user.email, cartId: key.id, lines: prepared.lines, amounts, gift: normalizeGift(gift),
  });
  await adminDb().collection(COLLECTIONS.checkouts).doc(session.id).set({
    ...snapshot,
    createdAt: Timestamp.fromMillis(now * 1000),
    expiresAt: Timestamp.fromMillis((now + 7 * 24 * 3600) * 1000), // TTL : gardé une semaine (webhooks tardifs)
  });
  return { status: 'ok', url: session.url };
}
