// Présentation des commandes dans l'espace client, pure (testée sans base). Les commandes migrées de l'ancien
// site n'ont ni référence ni toujours tous les champs : chaque valeur est lue avec prudence.
import { orderStatus } from '../db/schema';

export const STATUS_LABELS: Record<string, string> = {
  paid: 'Payée',
  preparing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  refunded: 'Remboursée',
  cancelled: 'Annulée',
};

// Commandes encore en cours : le compte ne peut pas être supprimé avant leur livraison.
export const IN_PROGRESS = new Set(['paid', 'preparing', 'shipped']);

// Identifiant de document accepté dans l'adresse de la page (session Stripe ou ancien identifiant Firestore).
export const ORDER_ID = /^[A-Za-z0-9_-]{1,200}$/;

const text = (v: unknown) => (typeof v === 'string' ? v : '');
const int = (v: unknown) => (Number.isInteger(v) ? (v as number) : 0);
const date = (v: unknown) =>
  v && typeof v === 'object' && 'toDate' in v && typeof v.toDate === 'function' ? (v.toDate() as Date) : null;

export type OrderLine = { key: string; name: string; variantLabel: string; quantity: number; unitPriceCents: number };
export type OrderDetail = {
  id: string;
  reference: string;
  createdAt: Date | null;
  status: string;
  statusLabel: string;
  items: OrderLine[];
  amounts: { subtotalCents: number; deliveryCents: number; totalCents: number };
  shipping: { name: string; line1: string; line2: string; zipCode: string; city: string };
  contact: { email: string; phone: string }; // gardés dans la commande (export des données)
  gift: { wrap: boolean; message: string };
  tracking: { carrier: string; number: string; url: string } | null;
};

// Lien de suivi : seulement une adresse https (le champ est saisi au back-office).
const safeUrl = (v: unknown) => {
  const s = text(v);
  try {
    return new URL(s).protocol === 'https:' ? s : '';
  } catch {
    return '';
  }
};

export function orderDetail(id: string, d: Record<string, unknown>): OrderDetail {
  const status = orderStatus.safeParse(d.status).success ? (d.status as string) : 'paid';
  const items = Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];
  const amounts = (d.amounts ?? {}) as Record<string, unknown>;
  const ship = (d.shipping ?? {}) as Record<string, unknown>;
  const customer = (d.customer ?? {}) as Record<string, unknown>;
  const gift = (d.gift ?? {}) as Record<string, unknown>;
  const tracking = d.tracking && typeof d.tracking === 'object' ? (d.tracking as Record<string, unknown>) : null;
  return {
    id,
    // Ancienne commande : même présentation que l'ancien site (8 premiers caractères, en capitales).
    reference: text(d.reference) || id.slice(0, 8).toUpperCase(),
    createdAt: date(d.createdAt),
    status,
    statusLabel: STATUS_LABELS[status]!,
    items: items.map((i, n) => ({
      key: `${text(i.productId)}/${text(i.variantId)}/${n}`,
      name: text(i.name),
      variantLabel: text(i.variantLabel),
      quantity: int(i.quantity),
      unitPriceCents: int(i.unitPriceCents),
    })),
    amounts: { subtotalCents: int(amounts.subtotalCents), deliveryCents: int(amounts.deliveryCents), totalCents: int(amounts.totalCents) },
    shipping: { name: text(customer.name), line1: text(ship.line1), line2: text(ship.line2), zipCode: text(ship.zipCode), city: text(ship.city) },
    contact: { email: text(customer.email), phone: text(customer.phone) },
    gift: { wrap: gift.wrap === true, message: text(gift.message) },
    tracking: tracking && text(tracking.number)
      ? { carrier: text(tracking.carrier), number: text(tracking.number), url: safeUrl(tracking.url) }
      : null,
  };
}

// Plus récente d'abord ; les commandes sans date à la fin.
export const byNewest = (a: OrderDetail, b: OrderDetail) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
