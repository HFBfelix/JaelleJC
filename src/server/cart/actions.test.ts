// Entrées refusées par les Server Actions avant tout accès à la base (prix envoyé, quantité ou identifiant trafiqués).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_CART } from './types';

const service = vi.hoisted(() => ({
  addToCart: vi.fn(async () => ({ cart: EMPTY_CART, status: 'added' as const })),
  updateCartLine: vi.fn(async () => ({ cart: EMPTY_CART, status: 'updated' as const })),
  getCartView: vi.fn(async () => EMPTY_CART),
}));
vi.mock('./service', () => service);

const { addToCartAction, updateCartAction } = await import('./actions');

beforeEach(() => vi.clearAllMocks());

describe('ajout : entrée validée', () => {
  it('identifiants + quantité : transmis au service', async () => {
    await addToCartAction({ productId: 'e2e-publie', variantId: 'unique', quantity: 1 });
    expect(service.addToCart).toHaveBeenCalledWith({ productId: 'e2e-publie', variantId: 'unique' }, 1);
  });

  it.each([
    ['prix envoyé par le navigateur', { productId: 'p', variantId: 'unique', quantity: 1, priceCents: 1 }],
    ['nom envoyé', { productId: 'p', variantId: 'unique', quantity: 1, name: 'x' }],
    ['quantité nulle', { productId: 'p', variantId: 'unique', quantity: 0 }],
    ['quantité négative', { productId: 'p', variantId: 'unique', quantity: -3 }],
    ['quantité décimale', { productId: 'p', variantId: 'unique', quantity: 1.5 }],
    ['quantité énorme', { productId: 'p', variantId: 'unique', quantity: 1000 }],
    ['quantité en texte', { productId: 'p', variantId: 'unique', quantity: '1' }],
    ['chemin à la place d’un identifiant', { productId: '../carts/x', variantId: 'unique', quantity: 1 }],
    ['identifiant vide', { productId: '', variantId: 'unique', quantity: 1 }],
    ['identifiant trop long', { productId: 'a'.repeat(129), variantId: 'unique', quantity: 1 }],
    ['rien', undefined],
  ])('%s : refusé, base non touchée', async (_, input) => {
    const result = await addToCartAction(input);
    expect(result.status).toBe('error');
    expect(service.addToCart).not.toHaveBeenCalled();
  });
});

describe('modification : entrée validée', () => {
  it('quantité 0 permise (retrait)', async () => {
    await updateCartAction({ productId: 'p', variantId: 'unique', quantity: 0 });
    expect(service.updateCartLine).toHaveBeenCalledWith({ productId: 'p', variantId: 'unique' }, 0);
  });

  it('prix ou total envoyés : refusés', async () => {
    expect((await updateCartAction({ productId: 'p', variantId: 'unique', quantity: 1, totalCents: 1 })).status).toBe('error');
    expect(service.updateCartLine).not.toHaveBeenCalled();
  });
});

it('erreur de la base : message générique, panier relu', async () => {
  service.addToCart.mockRejectedValueOnce(new Error('base indisponible'));
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const result = await addToCartAction({ productId: 'p', variantId: 'unique', quantity: 1 });
  expect(result.status).toBe('error');
  expect(spy).toHaveBeenCalledWith('panier : modification impossible');
  spy.mockRestore();
});
