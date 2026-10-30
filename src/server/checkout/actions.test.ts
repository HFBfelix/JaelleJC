// « Confirmer et payer » : anonyme refusé, entrée trafiquée refusée, avant tout appel à Stripe.
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getSessionUser: vi.fn(), startCheckout: vi.fn() }));
vi.mock('../auth/session', () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock('./service', () => ({ startCheckout: mocks.startCheckout }));

const { startCheckoutAction } = await import('./actions');
const user = { uid: 'u1', email: 'a@b.fr', admin: false, authTime: 0 };

beforeEach(() => vi.clearAllMocks());

it('anonyme : connexion demandée, Stripe jamais appelé', async () => {
  mocks.getSessionUser.mockResolvedValueOnce(null);
  expect(await startCheckoutAction({ gift: { wrap: false, message: '' } })).toEqual({ status: 'connexion' });
  expect(mocks.startCheckout).not.toHaveBeenCalled();
});

it.each([
  { gift: { wrap: false, message: '' }, amountCents: 1 },
  { gift: { wrap: true, message: 'x'.repeat(301) } },
  { gift: { wrap: 'oui', message: '' } },
  null,
])('entrée trafiquée %# : refusée', async (input) => {
  mocks.getSessionUser.mockResolvedValue(user);
  expect(await startCheckoutAction(input)).toEqual({ status: 'invalide' });
  expect(mocks.startCheckout).not.toHaveBeenCalled();
});

it('cliente connectée : seule l’option cadeau est transmise', async () => {
  mocks.getSessionUser.mockResolvedValueOnce(user);
  mocks.startCheckout.mockResolvedValueOnce({ status: 'ok', url: 'https://checkout.stripe.com/c/pay/cs_test_x' });
  expect(await startCheckoutAction({ gift: { wrap: true, message: 'Bienvenue' } })).toMatchObject({ status: 'ok' });
  expect(mocks.startCheckout).toHaveBeenCalledWith(user, { wrap: true, message: 'Bienvenue' }, undefined);
});

it('adresse enregistrée : seul son identifiant est transmis (relue en base chez cette cliente)', async () => {
  mocks.getSessionUser.mockResolvedValueOnce(user);
  mocks.startCheckout.mockResolvedValueOnce({ status: 'adresse' });
  expect(await startCheckoutAction({ gift: { wrap: false, message: '' }, addressId: 'a1' })).toEqual({ status: 'adresse' });
  expect(mocks.startCheckout).toHaveBeenCalledWith(user, { wrap: false, message: '' }, 'a1');
});

it.each([
  { gift: { wrap: false, message: '' }, addressId: '../autre/adresses/x' },
  { gift: { wrap: false, message: '' }, address: { line1: '1 rue A', zipCode: '75001' } },
])('adresse trafiquée %# : refusée', async (input) => {
  mocks.getSessionUser.mockResolvedValue(user);
  expect(await startCheckoutAction(input)).toEqual({ status: 'invalide' });
  expect(mocks.startCheckout).not.toHaveBeenCalled();
});

it('erreur Stripe : message générique', async () => {
  mocks.getSessionUser.mockResolvedValueOnce(user);
  mocks.startCheckout.mockRejectedValueOnce(new Error('Stripe indisponible'));
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(await startCheckoutAction({ gift: { wrap: false, message: '' } })).toEqual({ status: 'erreur' });
  spy.mockRestore();
});
