// Catalogue PDF, « Rédiger avec l'IA » : rien sans droit admin ; identifiants invalides ou trop nombreux refusés.
import { beforeEach, expect, it, vi } from 'vitest';
import { CATALOGUE_PIECES_MAX } from './logic';

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), texts: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../auth/session', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('./service', () => ({ catalogueTexts: mocks.texts }));
const { catalogueTextsAction } = await import('./actions');

beforeEach(() => vi.clearAllMocks());

it('cliente ordinaire ou anonyme : aucun appel à Mistral', async () => {
  mocks.requireAdmin.mockResolvedValue(null);
  expect(await catalogueTextsAction({ ids: ['piece-1'] })).toEqual({ status: 'connexion' });
  expect(mocks.texts).not.toHaveBeenCalled();
});

it('saisie invalide : refusée avant tout appel', async () => {
  mocks.requireAdmin.mockResolvedValue({ uid: 'a' });
  for (const input of [
    { ids: [] }, { ids: ['../users'] }, { ids: ['a/b'] }, { ids: ['x'.repeat(129)] }, { ids: [1] },
    { ids: Array.from({ length: CATALOGUE_PIECES_MAX + 1 }, (_, i) => `p${i}`) }, { ids: ['p'], x: 1 }, null, 'p',
  ]) expect(await catalogueTextsAction(input)).toEqual({ status: 'invalide' });
  expect(mocks.texts).not.toHaveBeenCalled();
});

it('administratrice : textes demandés à son nom ; échec → « erreur », sans détail', async () => {
  mocks.requireAdmin.mockResolvedValue({ uid: 'a' });
  mocks.texts.mockResolvedValue({ status: 'ok', texts: {} });
  expect(await catalogueTextsAction({ ids: ['piece-1', 'piece-2'] })).toEqual({ status: 'ok', texts: {} });
  expect(mocks.texts).toHaveBeenCalledWith('a', ['piece-1', 'piece-2']);
  mocks.texts.mockRejectedValue(new Error('Mistral indisponible'));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(await catalogueTextsAction({ ids: ['piece-1'] })).toEqual({ status: 'erreur' });
});
