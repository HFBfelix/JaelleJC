// Règles du paiement, pures (testées sans base ni Stripe). Montants en centimes ; prix toujours relus en base.
import { z } from 'zod';
import { deliveryFor, lineKey, normalize, type DeliveryRule } from '../cart/logic';
import type { CartItem, Offer } from '../cart/types';
import type { CheckoutSnapshot } from '../db/schema';

export const GIFT_MESSAGE_MAX = 300;
// La session de paiement Stripe expire au bout de 30 minutes (minimum accepté par Stripe).
export const CHECKOUT_EXPIRES_SECONDS = 30 * 60;

// Seules entrées du navigateur au clic « Payer » : l'option cadeau et, au choix, l'identifiant d'une adresse
// enregistrée (relue en base chez cette cliente). Aucun prix, aucune ligne.
export const checkoutInput = z.strictObject({
  gift: z.strictObject({ wrap: z.boolean(), message: z.string().max(GIFT_MESSAGE_MAX) }),
  addressId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/).optional(),
});

export const normalizeGift = (gift: { wrap: boolean; message: string }) =>
  ({ wrap: gift.wrap, message: gift.wrap ? gift.message.trim() : '' });

export type CheckoutLine = CheckoutSnapshot['lines'][number];

// Au clic « Payer » : le panier doit être exactement disponible (sinon il est corrigé et la cliente prévenue).
export function prepareLines(items: CartItem[], offers: Map<string, Offer>):
  { ok: true; lines: CheckoutLine[] } | { ok: false; reason: 'vide' | 'stock' } {
  const checked = normalize(items, offers);
  if (checked.changed) return { ok: false, reason: 'stock' };
  if (!checked.items.length) return { ok: false, reason: 'vide' };
  return {
    ok: true,
    lines: checked.items.map((item) => {
      const offer = offers.get(lineKey(item.productId, item.variantId))!;
      return {
        productId: item.productId,
        variantId: item.variantId,
        sku: offer.sku,
        name: offer.name,
        variantLabel: offer.variantLabel,
        image: offer.image?.url ?? '',
        unitPriceCents: offer.unitPriceCents,
        quantity: item.quantity,
      };
    }),
  };
}

export function amountsOf(lines: CheckoutLine[], rule: DeliveryRule) {
  const subtotalCents = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
  const deliveryCents = deliveryFor(subtotalCents, rule).cents;
  return { subtotalCents, deliveryCents, totalCents: subtotalCents + deliveryCents };
}

// Lignes envoyées à Stripe : prix unitaire lu en base, identifiants en métadonnées (contrôle au webhook).
export function stripeLineItems(lines: CheckoutLine[]) {
  return lines.map((l) => ({
    quantity: l.quantity,
    price_data: {
      currency: 'eur',
      unit_amount: l.unitPriceCents,
      product_data: {
        name: l.variantLabel ? `${l.name} — ${l.variantLabel}` : l.name,
        ...(l.image.startsWith('https://') ? { images: [l.image] } : {}),
        metadata: { productId: l.productId, variantId: l.variantId, sku: l.sku },
      },
    },
  }));
}

export function shippingOption(deliveryCents: number) {
  return {
    shipping_rate_data: {
      type: 'fixed_amount' as const,
      display_name: deliveryCents ? 'Livraison à domicile' : 'Livraison offerte',
      fixed_amount: { amount: deliveryCents, currency: 'eur' },
    },
  };
}

// Webhook : le stock de chaque variante (lu en transaction) suffit-il pour toute la commande ?
// Tout ou rien : une commande n'est jamais servie à moitié.
export function allocate(lines: CheckoutLine[], stocks: Map<string, number | undefined>):
  { ok: true; remaining: Map<string, number> } | { ok: false } {
  const remaining = new Map<string, number>();
  for (const l of lines) {
    const key = lineKey(l.productId, l.variantId);
    const available = remaining.get(key) ?? stocks.get(key);
    if (available === undefined || available < l.quantity) return { ok: false };
    remaining.set(key, available - l.quantity);
  }
  return { ok: true, remaining };
}

// Panier du compte après la commande : quantités achetées retirées (le reste est conservé).
export function withoutPurchased(items: CartItem[], lines: CheckoutLine[]): CartItem[] {
  return items.flatMap((item) => {
    const bought = lines.filter((l) => l.productId === item.productId && l.variantId === item.variantId)
      .reduce((sum, l) => sum + l.quantity, 0);
    const quantity = item.quantity - bought;
    return quantity > 0 ? [{ ...item, quantity }] : [];
  });
}

// Référence lisible donnée à la cliente : JJC-AAMMJJ-XXXX (sans caractères ambigus).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function orderReference(date: Date, random: Uint8Array) {
  const d = date.toISOString().slice(2, 10).replaceAll('-', '');
  const suffix = Array.from(random.slice(0, 4), (b) => ALPHABET[b % ALPHABET.length]).join('');
  return `JJC-${d}-${suffix}`;
}

// Données utiles d'une session Stripe terminée (forme de l'API 2026-02-25.clover).
export const paidSession = z.object({
  id: z.string().regex(/^cs_(test|live)_[A-Za-z0-9]+$/),
  payment_status: z.string(),
  amount_total: z.number().int().nullable(),
  currency: z.string().nullable(),
  client_reference_id: z.string().nullable(),
  payment_intent: z.union([z.string(), z.object({ id: z.string() })]).nullable(),
  customer_details: z.object({
    email: z.string().nullable(),
    name: z.string().nullable(),
    phone: z.string().nullable(),
  }).nullable(),
  collected_information: z.object({
    shipping_details: z.object({
      name: z.string(),
      address: z.object({
        line1: z.string().nullable(),
        line2: z.string().nullable(),
        postal_code: z.string().nullable(),
        city: z.string().nullable(),
        country: z.string().nullable(),
      }),
    }).nullable(),
  }).nullable().optional(),
}).passthrough();
export type PaidSession = z.infer<typeof paidSession>;

export const paymentIntentId = (s: PaidSession) =>
  (typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id) ?? '';

// Le paiement correspond-il exactement à l'instantané (montant, devise, cliente) ?
export const matchesSnapshot = (s: PaidSession, snap: CheckoutSnapshot) =>
  s.amount_total === snap.amounts.totalCents && s.currency === 'eur' && s.client_reference_id === snap.uid;

// Commande enregistrée : instantané (noms, prix, adresse) qui ne bouge plus ensuite.
export function buildOrder(s: PaidSession, snap: CheckoutSnapshot, eventId: string, outcome: 'paid' | 'stock' | 'montant', reference: string) {
  const ship = s.collected_information?.shipping_details;
  return {
    userId: snap.uid,
    reference,
    items: snap.lines,
    amounts: snap.amounts,
    customer: {
      uid: snap.uid,
      email: s.customer_details?.email || snap.email,
      name: ship?.name || s.customer_details?.name || '',
      phone: s.customer_details?.phone ?? '',
    },
    shipping: {
      line1: ship?.address.line1 ?? '',
      line2: ship?.address.line2 ?? '',
      zipCode: ship?.address.postal_code ?? '',
      city: ship?.address.city ?? '',
      country: ship?.address.country ?? '',
    },
    gift: snap.gift,
    stripe: { sessionId: s.id, paymentIntentId: paymentIntentId(s), eventId },
    status: outcome === 'paid' ? ('paid' as const) : ('refunded' as const),
    refund: outcome === 'paid' ? null : { reason: outcome, id: null },
    tracking: null,
    emails: { cliente: 'en_attente', boutique: 'en_attente' } as Record<'cliente' | 'boutique', EmailStatus>,
  };
}
export type EmailStatus = 'en_attente' | 'envoye';
export type NewOrder = ReturnType<typeof buildOrder>;
