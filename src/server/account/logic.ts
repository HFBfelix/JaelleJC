// Règles de l'espace client, pures (testées sans base) : entrées des formulaires, suppression du compte.
import { z } from 'zod';
import { adresse } from '../db/schema';
import { IN_PROGRESS } from '../orders/view';

// Identifiant de document Firestore généré par le serveur (ou ancien identifiant migré).
export const docId = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);

// Le pays n'est pas saisi : livraison en France seulement.
export const addressFields = adresse.omit({ country: true });
export const saveAddressInput = z.strictObject({ id: docId.optional(), address: addressFields });
export const deleteAddressInput = z.strictObject({ id: docId });
// Suppression : case de confirmation cochée, rien d'autre.
export const deleteAccountInput = z.strictObject({ confirm: z.literal(true) });

export type AddressView = z.infer<typeof addressFields> & { id: string };

// Adresse complète et valide (proposée au paiement) ; l'identifiant n'est pas un champ de l'adresse.
const looseFields = z.object(addressFields.shape);
export const isComplete = (a: AddressView) => looseFields.safeParse(a).success;
export const withoutId = (a: AddressView): Omit<AddressView, 'id'> =>
  ({ label: a.label, name: a.name, line1: a.line1, line2: a.line2, zipCode: a.zipCode, city: a.city, phone: a.phone });

// Adresse lue en base pour l'affichage : une adresse migrée incomplète s'affiche quand même (à corriger).
export function addressView(id: string, d: Record<string, unknown>): AddressView {
  const t = (k: string) => (typeof d[k] === 'string' ? (d[k] as string) : '');
  return { id, label: t('label'), name: t('name'), line1: t('line1'), line2: t('line2'), zipCode: t('zipCode'), city: t('city'), phone: t('phone') };
}

// Un paiement ouvert depuis moins longtemps que la session Stripe peut encore aboutir à une commande.
export type PendingCheckout = { status?: unknown; createdAtMs: number | null };

export function deletionBlocker(orderStatuses: unknown[], checkouts: PendingCheckout[], checkoutTtlSeconds: number, nowMs = Date.now()) {
  if (orderStatuses.some((s) => typeof s === 'string' && IN_PROGRESS.has(s))) return 'commande-en-cours' as const;
  const open = checkouts.some((c) => c.status === undefined && (c.createdAtMs === null || nowMs - c.createdAtMs <= checkoutTtlSeconds * 1000));
  return open ? ('paiement-en-cours' as const) : null;
}
