import { describe, expect, it } from 'vitest';
import {
  CART_TTL_DAYS, MAX_LINES, MAX_QUANTITY, addQuantity, deliveryFor, expiryFrom, isExpired, lineKey,
  mergeItems, normalize, priceCart, setQuantity, shouldRenew, updateExisting,
} from './logic';
import type { CartItem, Offer } from './types';

const offer = (productId: string, stock: number, unitPriceCents = 4500, variantId = 'unique'): Offer => ({
  productId, variantId, slug: productId, name: `Pièce ${productId}`, variantLabel: '', categoryName: 'Bébé',
  image: null, sku: `SKU-${productId}`, unitPriceCents, stock,
});
const offersOf = (...list: Offer[]) => new Map(list.map((o) => [lineKey(o.productId, o.variantId), o]));
const target = (productId: string, variantId = 'unique') => ({ productId, variantId });

describe('ajout et quantités', () => {
  it('ajoute une pièce, puis +1 additionne', () => {
    const a = addQuantity([], target('cape'), 1, offer('cape', 5));
    expect(a).toEqual({ items: [{ productId: 'cape', variantId: 'unique', quantity: 1 }], status: 'added' });
    const b = addQuantity(a.items, target('cape'), 2, offer('cape', 5));
    expect(b.items[0]!.quantity).toBe(3);
    expect(b.status).toBe('added');
  });

  it('plafonne au stock et le signale', () => {
    const r = addQuantity([{ productId: 'cape', variantId: 'unique', quantity: 2 }], target('cape'), 1, offer('cape', 2));
    expect(r.items[0]!.quantity).toBe(2);
    expect(r.status).toBe('capped');
  });

  it('plafonne à 99 même avec un grand stock', () => {
    const r = setQuantity([], target('cape'), 500, offer('cape', 1000));
    expect(r.items[0]!.quantity).toBe(MAX_QUANTITY);
    expect(r.status).toBe('capped');
  });

  it('refuse une pièce épuisée ou retirée de la vente, et retire la ligne existante', () => {
    const items: CartItem[] = [{ productId: 'cape', variantId: 'unique', quantity: 1 }];
    expect(addQuantity([], target('cape'), 1, offer('cape', 0))).toEqual({ items: [], status: 'unavailable' });
    expect(addQuantity(items, target('cape'), 1, undefined)).toEqual({ items: [], status: 'unavailable' });
  });

  it('quantité 0 : ligne retirée', () => {
    const items: CartItem[] = [{ productId: 'cape', variantId: 'unique', quantity: 3 }];
    expect(setQuantity(items, target('cape'), 0, offer('cape', 5))).toEqual({ items: [], status: 'removed' });
  });

  it('modifier : lignes existantes seulement (pas d’ajout détourné)', () => {
    const items: CartItem[] = [{ productId: 'cape', variantId: 'unique', quantity: 1 }];
    expect(updateExisting(items, target('autre'), 2, offer('autre', 5))).toEqual({ items, status: 'error' });
    expect(updateExisting(items, target('cape'), 2, offer('cape', 5)).items[0]!.quantity).toBe(2);
    expect(updateExisting(items, target('autre'), 0, offer('autre', 5)).status).toBe('removed');
  });

  it('distingue deux variantes du même produit', () => {
    const r1 = addQuantity([], target('veste', 'bleu-6m'), 1, offer('veste', 3, 6000, 'bleu-6m'));
    const r2 = addQuantity(r1.items, target('veste', 'bleu-9m'), 1, offer('veste', 3, 6000, 'bleu-9m'));
    expect(r2.items).toHaveLength(2);
  });

  it('nombre de lignes limité', () => {
    const full = Array.from({ length: MAX_LINES }, (_, i) => ({ productId: `p${i}`, variantId: 'unique', quantity: 1 }));
    expect(addQuantity(full, target('nouveau'), 1, offer('nouveau', 5)).status).toBe('full');
    expect(addQuantity(full, target('p0'), 1, offer('p0', 5)).status).toBe('added'); // ligne existante : permis
  });
});

describe('fusion à la connexion', () => {
  it('quantités additionnées, plafonnées au stock ; nouvelles lignes ajoutées ; pièces indisponibles ignorées', () => {
    const account: CartItem[] = [{ productId: 'a', variantId: 'unique', quantity: 2 }];
    const guest: CartItem[] = [
      { productId: 'a', variantId: 'unique', quantity: 2 },
      { productId: 'b', variantId: 'unique', quantity: 1 },
      { productId: 'c', variantId: 'unique', quantity: 1 },
    ];
    expect(mergeItems(account, guest, offersOf(offer('a', 3), offer('b', 5)))).toEqual([
      { productId: 'a', variantId: 'unique', quantity: 3 },
      { productId: 'b', variantId: 'unique', quantity: 1 },
    ]);
  });

  it('compte vide : panier visiteur repris', () => {
    const guest: CartItem[] = [{ productId: 'a', variantId: 'unique', quantity: 1 }];
    expect(mergeItems([], guest, offersOf(offer('a', 3)))).toEqual(guest);
  });
});

describe('remise en accord avec la base', () => {
  it('retire les pièces indisponibles et ramène les quantités au stock', () => {
    const items: CartItem[] = [
      { productId: 'a', variantId: 'unique', quantity: 3 },
      { productId: 'b', variantId: 'unique', quantity: 1 },
      { productId: 'c', variantId: 'unique', quantity: 1 },
    ];
    const r = normalize(items, offersOf(offer('a', 2), offer('c', 0)));
    expect(r.items).toEqual([{ productId: 'a', variantId: 'unique', quantity: 2 }]);
    expect(r).toMatchObject({ removed: 2, capped: 1, changed: true });
  });

  it('panier conforme : rien ne change', () => {
    expect(normalize([{ productId: 'a', variantId: 'unique', quantity: 1 }], offersOf(offer('a', 2))).changed).toBe(false);
  });
});

describe('montants (centimes, relus en base)', () => {
  const items: CartItem[] = [
    { productId: 'a', variantId: 'unique', quantity: 2 },
    { productId: 'b', variantId: 'unique', quantity: 1 },
  ];

  it('sous-total, nombre de pièces et forfait de livraison', () => {
    const view = priceCart(items, offersOf(offer('a', 5, 4550), offer('b', 5, 8900)), { freeThresholdCents: 15000, flatRateCents: 690 });
    expect(view.subtotalCents).toBe(18000);
    expect(view.count).toBe(3);
    expect(view.delivery).toEqual({ kind: 'free', cents: 0, freeThresholdCents: 15000, remainingCents: 0 });
    expect(view.totalCents).toBe(18000);
    expect(view.lines[0]).toMatchObject({ unitPriceCents: 4550, lineTotalCents: 9100, canIncrease: true });
  });

  it('sous le seuil : forfait ajouté et reste à dépenser', () => {
    const view = priceCart(items.slice(1), offersOf(offer('b', 1, 8900)), { freeThresholdCents: 15000, flatRateCents: 690 });
    expect(view.delivery).toEqual({ kind: 'flat', cents: 690, freeThresholdCents: 15000, remainingCents: 6100 });
    expect(view.totalCents).toBe(9590);
    expect(view.lines[0]!.canIncrease).toBe(false); // stock atteint, sans dévoiler le nombre exact
  });

  it('le prix suit la base, pas le panier', () => {
    const before = priceCart(items.slice(1), offersOf(offer('b', 5, 8900)), null);
    const after = priceCart(items.slice(1), offersOf(offer('b', 5, 9900)), null);
    expect([before.totalCents, after.totalCents]).toEqual([8900, 9900]);
  });

  it('réglage de livraison absent : calculée au paiement, total estimé sans livraison', () => {
    const view = priceCart(items.slice(1), offersOf(offer('b', 5, 8900)), null);
    expect(view.delivery.kind).toBe('unknown');
    expect(view.totalCents).toBe(8900);
  });

  it('forfait à 0 : livraison offerte', () => {
    expect(deliveryFor(1000, { freeThresholdCents: 0, flatRateCents: 0 }).kind).toBe('free');
  });

  it('pièce retirée signalée', () => {
    expect(priceCart(items, offersOf(offer('a', 5)), null).adjusted).toBe(true);
    expect(priceCart(items.slice(0, 1), offersOf(offer('a', 5)), null).adjusted).toBe(false);
  });
});

describe('expiration (7 jours, renouvelée à chaque activité)', () => {
  const now = new Date('2026-10-28T10:00:00Z');

  it(`expire ${CART_TTL_DAYS} jours après la dernière activité`, () => {
    expect(expiryFrom(now).toISOString()).toBe('2026-11-04T10:00:00.000Z');
    expect(isExpired(expiryFrom(now), new Date('2026-11-04T09:59:59Z'))).toBe(false);
    expect(isExpired(expiryFrom(now), new Date('2026-11-04T10:00:00Z'))).toBe(true);
  });

  it('une visite renouvelle au plus une fois par heure', () => {
    expect(shouldRenew(now, new Date('2026-10-28T10:59:59Z'))).toBe(false);
    expect(shouldRenew(now, new Date('2026-10-28T11:00:00Z'))).toBe(true);
  });
});
