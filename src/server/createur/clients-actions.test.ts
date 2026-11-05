// Suppression d'un compte depuis l'Atelier : rien sans droit admin ; mot SUPPRIMER revérifié ; connexion de moins de
// 10 minutes ; 10 par heure ; jamais l'e-mail ni l'identifiant dans le journal.
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), deleteClient: vi.fn(), limit: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../auth/session', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('../http/rate-limit', () => ({ takeRateLimit: mocks.limit }));
vi.mock('./clients', () => ({ deleteClient: mocks.deleteClient }));
const { deleteClientAction } = await import('./clients-actions');

const now = () => Math.floor(Date.now() / 1000);
const valid = { uid: 'cliente123', word: 'SUPPRIMER' };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ uid: 'admin1', authTime: now() - 60 });
  mocks.limit.mockResolvedValue(true);
  mocks.deleteClient.mockResolvedValue('supprime');
});

it('anonyme, cliente ordinaire ou droit retiré : « connexion », rien n’est supprimé', async () => {
  mocks.requireAdmin.mockResolvedValue(null);
  expect(await deleteClientAction(valid)).toBe('connexion');
  expect(mocks.deleteClient).not.toHaveBeenCalled();
});

it('mot faux ou identifiant douteux : refusé avant tout', async () => {
  for (const input of [{ ...valid, word: 'supprimer' }, { ...valid, word: '' }, { ...valid, uid: '../x' }, { uid: 'c' }, null]) {
    expect(await deleteClientAction(input)).toBe('invalide');
  }
  expect(mocks.deleteClient).not.toHaveBeenCalled();
});

it('connexion de l’administratrice de plus de 10 minutes : reconnexion demandée', async () => {
  mocks.requireAdmin.mockResolvedValue({ uid: 'admin1', authTime: now() - 11 * 60 });
  expect(await deleteClientAction(valid)).toBe('reconnexion');
  expect(mocks.deleteClient).not.toHaveBeenCalled();
});

it('plus de 10 suppressions dans l’heure : « limite »', async () => {
  mocks.limit.mockResolvedValue(false);
  expect(await deleteClientAction(valid)).toBe('limite');
  expect(mocks.limit).toHaveBeenCalledWith('suppression-cliente', 'admin1', 10, 3600_000);
  expect(mocks.deleteClient).not.toHaveBeenCalled();
});

it('administratrice : suppression à son nom ; refus et échec rendus tels quels, sans détail dans le journal', async () => {
  expect(await deleteClientAction(valid)).toBe('supprime');
  expect(mocks.deleteClient).toHaveBeenCalledWith('admin1', 'cliente123');
  mocks.deleteClient.mockResolvedValue('commande-en-cours');
  expect(await deleteClientAction(valid)).toBe('commande-en-cours');
  mocks.deleteClient.mockRejectedValue(new Error('panne cliente123'));
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(await deleteClientAction(valid)).toBe('erreur');
  expect(JSON.stringify(spy.mock.calls)).not.toContain('cliente123');
  spy.mockRestore();
});
