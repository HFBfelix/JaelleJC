// Règles du panier, pures (testées sans base) : quantités plafonnées au stock, expiration, calcul des montants.
// Tous les montants sont en centimes (entiers) et calculés à partir des offres relues en base.
import type { CartItem, CartStatus, CartView, DeliveryView, Offer } from './types';

export const CART_TTL_DAYS = 7;
export const MAX_LINES = 30;
export const MAX_QUANTITY = 99;
// Une simple visite renouvelle l'expiration au plus une fois par heure (évite une écriture par page vue).
export const RENEW_AFTER_MS = 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

export type DeliveryRule = { freeThresholdCents: number; flatRateCents: number };

export const lineKey = (productId: string, variantId: string) => `${productId}/${variantId}`;

export const expiryFrom = (now: Date) => new Date(now.getTime() + CART_TTL_DAYS * DAY_MS);
export const isExpired = (expiresAt: Date, now: Date) => expiresAt.getTime() <= now.getTime();
export const shouldRenew = (updatedAt: Date, now: Date) => now.getTime() - updatedAt.getTime() >= RENEW_AFTER_MS;

const limitOf = (offer: Offer) => Math.min(offer.stock, MAX_QUANTITY);

// Fixe la quantité d'une ligne. Sans offre (pièce dépubliée, variante inactive) ou sans stock : ligne retirée.
export function setQuantity(
  items: CartItem[],
  target: { productId: string; variantId: string },
  quantity: number,
  offer: Offer | undefined,
): { items: CartItem[]; status: CartStatus } {
  const key = lineKey(target.productId, target.variantId);
  const index = items.findIndex((i) => lineKey(i.productId, i.variantId) === key);
  const without = items.filter((_, i) => i !== index);

  if (quantity <= 0) return { items: without, status: 'removed' };
  if (!offer || offer.stock <= 0) return { items: without, status: 'unavailable' };
  if (index === -1 && items.length >= MAX_LINES) return { items, status: 'full' };

  const limit = limitOf(offer);
  const kept = Math.min(Math.trunc(quantity), limit);
  const line = { productId: target.productId, variantId: target.variantId, quantity: kept };
  const next = index === -1 ? [...items, line] : items.map((item, i) => (i === index ? line : item));
  return { items: next, status: quantity > limit ? 'capped' : index === -1 ? 'added' : 'updated' };
}

// Modification d'une ligne existante seulement (l'ajout d'une pièce passe par addQuantity).
export function updateExisting(
  items: CartItem[],
  target: { productId: string; variantId: string },
  quantity: number,
  offer: Offer | undefined,
): { items: CartItem[]; status: CartStatus } {
  const exists = items.some((i) => lineKey(i.productId, i.variantId) === lineKey(target.productId, target.variantId));
  return !exists && quantity > 0 ? { items, status: 'error' } : setQuantity(items, target, quantity, offer);
}

// Ajout (+1, +2…) : additionne à la quantité déjà présente, puis plafonne.
export function addQuantity(
  items: CartItem[],
  target: { productId: string; variantId: string },
  added: number,
  offer: Offer | undefined,
) {
  const current = items.find((i) => lineKey(i.productId, i.variantId) === lineKey(target.productId, target.variantId));
  const result = setQuantity(items, target, (current?.quantity ?? 0) + added, offer);
  return { ...result, status: result.status === 'updated' ? ('added' as const) : result.status };
}

// Remet le panier en accord avec la base : lignes indisponibles retirées, quantités ramenées au stock.
export function normalize(items: CartItem[], offers: Map<string, Offer>) {
  const kept: CartItem[] = [];
  let removed = 0;
  let capped = 0;
  for (const item of items.slice(0, MAX_LINES)) {
    const offer = offers.get(lineKey(item.productId, item.variantId));
    if (!offer || offer.stock <= 0) { removed++; continue; }
    const quantity = Math.min(item.quantity, limitOf(offer));
    if (quantity < item.quantity) capped++;
    kept.push({ ...item, quantity });
  }
  return { items: kept, removed, capped, changed: removed > 0 || capped > 0 || items.length > MAX_LINES };
}

export function deliveryFor(subtotalCents: number, rule: DeliveryRule | null): DeliveryView {
  if (!rule) return { kind: 'unknown', cents: 0, freeThresholdCents: 0, remainingCents: 0 };
  const threshold = rule.freeThresholdCents;
  const free = rule.flatRateCents === 0 || (threshold > 0 && subtotalCents >= threshold);
  return {
    kind: free ? 'free' : 'flat',
    cents: free ? 0 : rule.flatRateCents,
    freeThresholdCents: threshold,
    remainingCents: free || threshold === 0 ? 0 : threshold - subtotalCents,
  };
}

// Vue affichée : prix unitaires relus en base, jamais ceux d'un appel précédent.
export function priceCart(items: CartItem[], offers: Map<string, Offer>, rule: DeliveryRule | null, adjusted = false): CartView {
  const checked = normalize(items, offers);
  const lines = checked.items.map((item) => {
    const offer = offers.get(lineKey(item.productId, item.variantId))!;
    return {
      productId: item.productId,
      variantId: item.variantId,
      slug: offer.slug,
      name: offer.name,
      variantLabel: offer.variantLabel,
      categoryName: offer.categoryName,
      image: offer.image,
      unitPriceCents: offer.unitPriceCents,
      quantity: item.quantity,
      lineTotalCents: offer.unitPriceCents * item.quantity,
      canIncrease: item.quantity < limitOf(offer),
    };
  });
  const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const delivery = lines.length ? deliveryFor(subtotalCents, rule) : deliveryFor(0, null);
  return { lines, count, subtotalCents, delivery, totalCents: subtotalCents + delivery.cents, adjusted: adjusted || checked.changed };
}
