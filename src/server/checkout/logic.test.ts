import { describe, expect, it } from 'vitest';
import { lineKey } from '../cart/logic';
import type { CartItem, Offer } from '../cart/types';
import type { CheckoutSnapshot } from '../db/schema';
import {
  allocate, amountsOf, buildOrder, checkoutInput, frenchPhone, matchesSnapshot, normalizeGift, orderReference, paidSession,
  prepareLines, shippingOption, stripeLineItems, withoutPurchased, type CheckoutLine,
} from './logic';

const offer = (productId: string, stock: number, unitPriceCents = 4500): Offer => ({
  productId, variantId: 'unique', slug: productId, name: `Pièce ${productId}`, variantLabel: '', categoryName: 'Bébé',
  image: { url: `https://firebasestorage.googleapis.com/v0/b/jaellejc.firebasestorage.app/o/${productId}.jpg`, alt: '' },
  sku: `SKU-${productId}`, unitPriceCents, stock,
});
const offersOf = (...list: Offer[]) => new Map(list.map((o) => [lineKey(o.productId, o.variantId), o]));
const item = (productId: string, quantity: number): CartItem => ({ productId, variantId: 'unique', quantity });
const line = (productId: string, quantity: number, unitPriceCents = 4500): CheckoutLine => ({
  productId, variantId: 'unique', sku: `SKU-${productId}`, name: `Pièce ${productId}`, variantLabel: '', image: '', unitPriceCents, quantity,
});

describe('entrée du navigateur au clic « Payer »', () => {
  const shipping = { name: 'C', line1: '1 rue A', line2: '', zipCode: '75001', city: 'Paris', phone: '0612345678' };
  it('option cadeau, adresse de livraison et choix de l’enregistrer', () => {
    expect(checkoutInput.safeParse({ gift: { wrap: true, message: 'Bienvenue' }, shipping, saveAddress: false }).success).toBe(true);
  });

  it.each([
    ['06 12 34 56 78', '+33612345678'], ['+33 6 12 34 56 78', '+33612345678'], ['0033612345678', '+33612345678'], ['01.23.45.67.89', '+33123456789'],
  ])('téléphone « %s » → %s', (raw, e164) => expect(frenchPhone.parse(raw)).toBe(e164));
  it.each(['', '0012345678', '061234567', '+44 20 7946 0000', '06 12 34 56 78 90', '<script>'])('téléphone « %s » : refusé', (raw) =>
    expect(frenchPhone.safeParse(raw).success).toBe(false));

  it.each([
    ['prix envoyé', { gift: { wrap: false, message: '' }, totalCents: 1 }],
    ['lignes envoyées', { gift: { wrap: false, message: '' }, lines: [] }],
    ['champ en trop dans le cadeau', { gift: { wrap: true, message: '', priceCents: 0 } }],
    ['message trop long', { gift: { wrap: true, message: 'x'.repeat(301) } }],
    ['rien', undefined],
  ])('%s : refusé', (_, input) => expect(checkoutInput.safeParse(input).success).toBe(false));

  it('sans emballage, pas de message ; message rogné', () => {
    expect(normalizeGift({ wrap: false, message: 'oublié' })).toEqual({ wrap: false, message: '' });
    expect(normalizeGift({ wrap: true, message: '  Bienvenue  ' })).toEqual({ wrap: true, message: 'Bienvenue' });
  });
});

describe('lignes au clic « Payer »', () => {
  it('panier conforme : lignes avec prix et référence lus en base', () => {
    const r = prepareLines([item('a', 2)], offersOf(offer('a', 5, 5500)));
    expect(r).toEqual({ ok: true, lines: [expect.objectContaining({ productId: 'a', sku: 'SKU-a', unitPriceCents: 5500, quantity: 2 })] });
  });

  it('stock insuffisant ou pièce retirée : paiement refusé', () => {
    expect(prepareLines([item('a', 3)], offersOf(offer('a', 2)))).toEqual({ ok: false, reason: 'stock' });
    expect(prepareLines([item('a', 1)], offersOf())).toEqual({ ok: false, reason: 'stock' });
    expect(prepareLines([], offersOf())).toEqual({ ok: false, reason: 'vide' });
  });

  it('montants : sous-total, livraison selon le réglage, total', () => {
    expect(amountsOf([line('a', 2, 4550)], { freeThresholdCents: 15000, flatRateCents: 690 }))
      .toEqual({ subtotalCents: 9100, deliveryCents: 690, totalCents: 9790 });
    expect(amountsOf([line('a', 1, 8900)], { freeThresholdCents: 0, flatRateCents: 0 }))
      .toEqual({ subtotalCents: 8900, deliveryCents: 0, totalCents: 8900 });
  });

  it('lignes Stripe : prix en centimes, euros, identifiants en métadonnées, image https seulement', () => {
    const [l] = stripeLineItems([{ ...line('a', 2, 4550), variantLabel: 'Écru', image: 'https://exemple.fr/a.jpg' }]);
    expect(l).toEqual({
      quantity: 2,
      price_data: {
        currency: 'eur', unit_amount: 4550,
        product_data: { name: 'Pièce a — Écru', images: ['https://exemple.fr/a.jpg'], metadata: { productId: 'a', variantId: 'unique', sku: 'SKU-a' } },
      },
    });
    expect(stripeLineItems([{ ...line('a', 1), image: 'http://x' }])[0]!.price_data.product_data).not.toHaveProperty('images');
    expect(shippingOption(0).shipping_rate_data.display_name).toBe('Livraison offerte');
  });
});

describe('webhook : stock décrémenté tout ou rien', () => {
  it('stock suffisant : restes calculés', () => {
    const r = allocate([line('a', 2), line('b', 1)], new Map([['a/unique', 2], ['b/unique', 5]]));
    expect(r.ok && [...r.remaining]).toEqual([['a/unique', 0], ['b/unique', 4]]);
  });

  it('une ligne manque : rien n’est décrémenté', () => {
    expect(allocate([line('a', 1), line('b', 2)], new Map([['a/unique', 1], ['b/unique', 1]]))).toEqual({ ok: false });
    expect(allocate([line('a', 1)], new Map())).toEqual({ ok: false });
  });

  it('panier du compte : quantités achetées retirées, le reste gardé', () => {
    expect(withoutPurchased([item('a', 3), item('b', 1)], [line('a', 2), line('b', 1)])).toEqual([item('a', 1)]);
  });
});

describe('commande', () => {
  const snap: CheckoutSnapshot = {
    uid: 'u1', email: 'cliente@exemple.fr', cartId: 'u_u1', lines: [line('a', 1, 8900)],
    amounts: { subtotalCents: 8900, deliveryCents: 0, totalCents: 8900 }, gift: { wrap: true, message: 'Bienvenue' },
  };
  const session = paidSession.parse({
    id: 'cs_test_abc123', payment_status: 'paid', amount_total: 8900, currency: 'eur', client_reference_id: 'u1',
    payment_intent: 'pi_123',
    customer_details: { email: 'cliente@exemple.fr', name: 'Camille', phone: '+33600000000' },
    collected_information: { shipping_details: { name: 'Camille Martin', address: { line1: '1 rue A', line2: null, postal_code: '75001', city: 'Paris', country: 'FR' } } },
  });

  it('paiement conforme : montant, devise et cliente identiques à l’instantané', () => {
    expect(matchesSnapshot(session, snap)).toBe(true);
    expect(matchesSnapshot({ ...session, amount_total: 100 }, snap)).toBe(false);
    expect(matchesSnapshot({ ...session, currency: 'usd' }, snap)).toBe(false);
    expect(matchesSnapshot({ ...session, client_reference_id: 'autre' }, snap)).toBe(false);
  });

  it('instantané figé : noms, prix, adresse, cadeau, statut', () => {
    const o = buildOrder(session, snap, 'evt_1', 'paid', 'JJC-261029-ABCD');
    expect(o).toMatchObject({
      userId: 'u1', reference: 'JJC-261029-ABCD', status: 'paid', refund: null,
      amounts: { totalCents: 8900 }, gift: { wrap: true, message: 'Bienvenue' },
      shipping: { line1: '1 rue A', zipCode: '75001', city: 'Paris', country: 'FR' },
      customer: { name: 'Camille Martin', email: 'cliente@exemple.fr' },
      stripe: { sessionId: 'cs_test_abc123', paymentIntentId: 'pi_123', eventId: 'evt_1' },
    });
    expect(buildOrder(session, snap, 'evt_1', 'stock', 'R')).toMatchObject({ status: 'refunded', refund: { reason: 'stock', id: null } });
  });

  it('référence lisible, sans caractère ambigu', () => {
    expect(orderReference(new Date('2026-10-29T10:00:00Z'), new Uint8Array([0, 1, 31, 32]))).toBe('JJC-261029-AB9A');
  });

  it('identifiant de session Stripe invalide : refusé', () => {
    expect(paidSession.safeParse({ ...session, id: '../orders/x' }).success).toBe(false);
  });
});
