/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
// Calcul du paiement côté serveur : le navigateur n'envoie que des identifiants
// et des quantités. Prix, stock et livraison sont relus en base (centimes entiers).

export const MAX_QTY_PER_ITEM = 20;
export const MAX_LINES = 30;

export interface CheckoutRequestItem {
  productId: string;
  quantity: number;
}

export interface CheckoutRequest {
  items: CheckoutRequestItem[];
  customerEmail: string | null;
}

// Champs de `produits/{id}` utilisés pour le paiement (prix encore en euros à l'étape 0)
export interface CheckoutProduct {
  name?: unknown;
  price?: unknown;
  stock?: unknown;
  status?: unknown;
  images?: unknown;
}

// `settings/delivery` (euros) : seuil de gratuité et forfait
export interface DeliverySettings {
  freeThreshold?: unknown;
  flatRate?: unknown;
}

export interface CheckoutLine {
  productId: string;
  name: string;
  image: string | null;
  unitAmountCents: number;
  quantity: number;
}

export interface CheckoutComputation {
  lines: CheckoutLine[];
  subtotalCents: number;
  deliveryCents: number;
  totalCents: number;
}

export type CheckoutErrorCode = "invalid_request" | "unavailable" | "out_of_stock";

export class CheckoutError extends Error {
  constructor(public code: CheckoutErrorCode, public productId?: string) {
    super(code);
  }
}

const PRODUCT_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function parseCheckoutRequest(data: unknown): CheckoutRequest {
  if (!data || typeof data !== "object") throw new CheckoutError("invalid_request");
  const raw = data as {cartItems?: unknown; customerEmail?: unknown};
  if (!Array.isArray(raw.cartItems) || raw.cartItems.length === 0 || raw.cartItems.length > MAX_LINES) {
    throw new CheckoutError("invalid_request");
  }

  // Les doublons sont regroupés ; tout autre champ envoyé (prix, nom…) est ignoré.
  const merged = new Map<string, number>();
  for (const entry of raw.cartItems) {
    if (!entry || typeof entry !== "object") throw new CheckoutError("invalid_request");
    const {productId, quantity} = entry as {productId?: unknown; quantity?: unknown};
    if (typeof productId !== "string" || !PRODUCT_ID_RE.test(productId)) throw new CheckoutError("invalid_request");
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_ITEM) {
      throw new CheckoutError("invalid_request");
    }
    const total = (merged.get(productId) || 0) + quantity;
    if (total > MAX_QTY_PER_ITEM) throw new CheckoutError("invalid_request");
    merged.set(productId, total);
  }

  let customerEmail: string | null = null;
  if (typeof raw.customerEmail === "string") {
    const email = raw.customerEmail.trim();
    if (email.length > 0 && email.length <= 254 && EMAIL_RE.test(email)) customerEmail = email;
  }

  return {
    items: [...merged.entries()].map(([productId, quantity]) => ({productId, quantity})),
    customerEmail,
  };
}

// Euros (nombre) → centimes entiers. Refuse tout ce qui n'est pas un montant valide.
export function eurosToCents(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function computeCheckout(
  items: CheckoutRequestItem[],
  products: Map<string, CheckoutProduct | undefined>,
  delivery: DeliverySettings | undefined,
  options: {requirePublished: boolean},
): CheckoutComputation {
  const lines: CheckoutLine[] = [];

  for (const {productId, quantity} of items) {
    const product = products.get(productId);
    if (!product || product.status === "archived") throw new CheckoutError("unavailable", productId);
    if (options.requirePublished && product.status !== "published") throw new CheckoutError("unavailable", productId);

    const unitAmountCents = eurosToCents(product.price);
    if (unitAmountCents === null || unitAmountCents <= 0) throw new CheckoutError("unavailable", productId);

    // Stock absent ou invalide = indisponible (on préfère refuser que survendre).
    const stock = product.stock;
    if (typeof stock !== "number" || !Number.isInteger(stock) || stock < quantity) {
      throw new CheckoutError("out_of_stock", productId);
    }

    const name = typeof product.name === "string" && product.name.trim() ? product.name.trim().slice(0, 200) : "Pièce Jaelle & JC";
    const firstImage = Array.isArray(product.images) ? product.images[0] : undefined;
    const image = typeof firstImage === "string" && firstImage.startsWith("https://") ? firstImage : null;

    lines.push({productId, name, image, unitAmountCents, quantity});
  }

  const subtotalCents = lines.reduce((sum, l) => sum + l.unitAmountCents * l.quantity, 0);
  const freeThresholdCents = eurosToCents(delivery?.freeThreshold) || 0;
  const flatRateCents = eurosToCents(delivery?.flatRate) || 0;
  const isFree = freeThresholdCents > 0 && subtotalCents >= freeThresholdCents;
  const deliveryCents = isFree ? 0 : flatRateCents;

  return {lines, subtotalCents, deliveryCents, totalCents: subtotalCents + deliveryCents};
}

// Adresse de retour après paiement : uniquement une origine autorisée, jamais celle fournie par le client.
export function resolveSiteOrigin(requestOrigin: unknown, allowedOrigins: string[]): string {
  if (typeof requestOrigin === "string" && allowedOrigins.includes(requestOrigin)) return requestOrigin;
  return allowedOrigins[0];
}
