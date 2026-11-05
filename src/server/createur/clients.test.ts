// Suppression depuis l'Atelier : compte d'administratrice et soi-même refusés ; même suppression que la cliente ;
// journal avec l'identifiant technique, jamais l'e-mail.
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), deleteAccount: vi.fn(), audit: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../firebase/admin', () => ({ adminAuth: () => ({ getUser: mocks.getUser }), adminDb: () => ({}) }));
vi.mock('../account/data', () => ({ deleteAccount: mocks.deleteAccount }));
vi.mock('../account/addresses', () => ({ listAddresses: vi.fn() }));
vi.mock('../account/profile', () => ({ loadProfile: vi.fn() }));
vi.mock('../orders/history', () => ({ ordersOf: vi.fn() }));
vi.mock('./products', () => ({ audit: mocks.audit }));
const { deleteClient } = await import('./clients');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ uid: 'c1', email: 'camille@exemple.fr', customClaims: {} });
  mocks.deleteAccount.mockResolvedValue('supprime');
});

it('cliente : supprimée par la même fonction que son propre bouton, journalisée sans e-mail', async () => {
  expect(await deleteClient('admin1', 'c1')).toBe('supprime');
  expect(mocks.deleteAccount).toHaveBeenCalledWith('c1');
  expect(mocks.audit).toHaveBeenCalledWith('admin1', 'cliente.supprimee', 'c1');
  expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain('camille@exemple.fr');
});

it('administratrice, soi-même ou compte inconnu : rien n’est supprimé ni journalisé', async () => {
  mocks.getUser.mockResolvedValue({ uid: 'a2', customClaims: { admin: true } });
  expect(await deleteClient('admin1', 'a2')).toBe('admin');
  mocks.getUser.mockResolvedValue({ uid: 'admin1', customClaims: {} });
  expect(await deleteClient('admin1', 'admin1')).toBe('admin');
  mocks.getUser.mockRejectedValue(new Error('user-not-found'));
  expect(await deleteClient('admin1', 'zz')).toBe('introuvable');
  expect(mocks.deleteAccount).not.toHaveBeenCalled();
  expect(mocks.audit).not.toHaveBeenCalled();
});

it('commande en cours : refus de la suppression rendu tel quel, rien de journalisé', async () => {
  mocks.deleteAccount.mockResolvedValue('commande-en-cours');
  expect(await deleteClient('admin1', 'c1')).toBe('commande-en-cours');
  expect(mocks.audit).not.toHaveBeenCalled();
});
