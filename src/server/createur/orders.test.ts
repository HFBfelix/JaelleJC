// Commandes dans l'espace créatrice : statuts permis, saisie de l'expédition, lien de suivi ; actions sans droit admin.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), moveOrder: vi.fn(), setStock: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../auth/session', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('../firebase/admin', () => ({ adminDb: () => { throw new Error('base touchée'); } }));
vi.mock('./products', () => ({ audit: vi.fn() }));

const { canMove, shipInput, stockInput, trackingUrl } = await import('./orders');
vi.doMock('./orders', async (orig) => ({ ...(await orig()), moveOrder: mocks.moveOrder, setStock: mocks.setStock }));
const actions = await import('./orders-actions');

beforeEach(() => vi.clearAllMocks());

describe('statuts', () => {
  it.each([['paid', 'preparing'], ['paid', 'shipped'], ['preparing', 'shipped'], ['shipped', 'delivered']])('%s → %s : permis', (a, b) =>
    expect(canMove(a, b)).toBe(true));
  it.each([['delivered', 'shipped'], ['shipped', 'preparing'], ['refunded', 'shipped'], ['cancelled', 'preparing'], ['paid', 'delivered'], ['paid', 'refunded']])(
    '%s → %s : refusé', (a, b) => expect(canMove(a, b)).toBe(false));
});

describe('expédition', () => {
  const base = { orderId: 'cs_test_x', carrier: 'colissimo', number: '6a12345678901' };
  it('numéro en capitales, lien La Poste', () => {
    const parsed = shipInput.parse(base);
    expect(parsed.number).toBe('6A12345678901');
    expect(trackingUrl('colissimo', parsed.number)).toBe('https://www.laposte.fr/outils/suivre-vos-envois?code=6A12345678901');
  });
  it.each([
    ['numéro trop court', { number: '123' }],
    ['numéro avec script', { number: '<script>' }],
    ['transporteur inconnu', { carrier: 'dhl' }],
    ['lien non https', { carrier: 'autre', url: 'javascript:alert(1)' }],
    ['champ en trop (statut)', { status: 'delivered' }],
  ])('%s : refusé', (_, over) => expect(shipInput.safeParse({ ...base, ...over }).success).toBe(false));
  it('stock négatif ou décimal : refusé', () => {
    expect(stockInput.safeParse({ productId: 'p', variantId: 'v', stock: -1, expectedStock: 0 }).success).toBe(false);
    expect(stockInput.safeParse({ productId: 'p', variantId: 'v', stock: 1.5, expectedStock: 0 }).success).toBe(false);
  });
});

describe('actions', () => {
  it('sans droit admin : rien ne s’exécute', async () => {
    mocks.requireAdmin.mockResolvedValue(null);
    expect(await actions.moveOrderAction({ orderId: 'o1', to: 'preparing' })).toEqual({ status: 'connexion' });
    expect(await actions.shipOrderAction({ orderId: 'o1', carrier: 'colissimo', number: '6A12345678901' })).toEqual({ status: 'connexion' });
    expect(await actions.setStockAction({ productId: 'p', variantId: 'v', stock: 1, expectedStock: 0 })).toEqual({ status: 'connexion' });
  });
  it('« remboursée » ou « expédiée » sans suivi par la voie simple : refusé', async () => {
    mocks.requireAdmin.mockResolvedValue({ uid: 'a' });
    expect(await actions.moveOrderAction({ orderId: 'o1', to: 'refunded' })).toEqual({ status: 'invalide' });
    expect(await actions.moveOrderAction({ orderId: 'o1', to: 'shipped' })).toEqual({ status: 'invalide' });
    expect(await actions.shipOrderAction({ orderId: 'o1', carrier: 'autre', number: '12345678' })).toEqual({ status: 'invalide' });
  });
});
