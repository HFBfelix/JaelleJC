// « Confirmer et payer » : anonyme refusé, entrée trafiquée refusée (prix, adresse, téléphone), avant tout appel à Stripe.
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getSessionUser: vi.fn(), startCheckout: vi.fn() }));
vi.mock('../auth/session', () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock('./service', () => ({ startCheckout: mocks.startCheckout }));

const { startCheckoutAction } = await import('./actions');
const user = { uid: 'u1', email: 'a@b.fr', admin: false, authTime: 0 };
const shipping = { name: 'Camille Martin', line1: '1 rue A', line2: '', zipCode: '75001', city: 'Paris', phone: '06 12 34 56 78' };
const valid = { gift: { wrap: false, message: '' }, shipping, saveAddress: false };

beforeEach(() => vi.clearAllMocks());

it('anonyme : connexion demandée, Stripe jamais appelé', async () => {
  mocks.getSessionUser.mockResolvedValueOnce(null);
  expect(await startCheckoutAction(valid)).toEqual({ status: 'connexion' });
  expect(mocks.startCheckout).not.toHaveBeenCalled();
});

it.each([
  { ...valid, amountCents: 1 },
  { ...valid, gift: { wrap: true, message: 'x'.repeat(301) } },
  { ...valid, gift: { wrap: 'oui', message: '' } },
  { gift: { wrap: false, message: '' } }, // sans livraison
  { ...valid, shipping: { ...shipping, zipCode: '7500' } },
  { ...valid, shipping: { ...shipping, phone: '' } },
  { ...valid, shipping: { ...shipping, phone: '+44 20 7946 0000' } },
  { ...valid, shipping: { ...shipping, country: 'BE' } },
  { ...valid, shipping: { ...shipping, name: ' ' } },
  { ...valid, addressId: '../autre/adresses/x' },
  null,
])('entrée trafiquée %# : refusée', async (input) => {
  mocks.getSessionUser.mockResolvedValue(user);
  expect(await startCheckoutAction(input)).toEqual({ status: 'invalide' });
  expect(mocks.startCheckout).not.toHaveBeenCalled();
});

it('cliente connectée : option cadeau, adresse (téléphone normalisé) et choix d’enregistrement transmis', async () => {
  mocks.getSessionUser.mockResolvedValueOnce(user);
  mocks.startCheckout.mockResolvedValueOnce({ status: 'ok', url: 'https://checkout.stripe.com/c/pay/cs_test_x' });
  expect(await startCheckoutAction({ ...valid, gift: { wrap: true, message: 'Bienvenue' }, saveAddress: true })).toMatchObject({ status: 'ok' });
  expect(mocks.startCheckout).toHaveBeenCalledWith(user, { wrap: true, message: 'Bienvenue' }, { ...shipping, phone: '+33612345678' }, true);
});

it('erreur Stripe : message générique', async () => {
  mocks.getSessionUser.mockResolvedValueOnce(user);
  mocks.startCheckout.mockRejectedValueOnce(new Error('Stripe indisponible'));
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(await startCheckoutAction(valid)).toEqual({ status: 'erreur' });
  spy.mockRestore();
});
