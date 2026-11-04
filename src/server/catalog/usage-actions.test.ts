// Recherche par usage : entrée invalide, sans clé ou limite atteinte → aucun appel à Mistral ; identifiants inconnus
// ignorés ; erreur → null, sans la phrase dans le journal.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ limit: vi.fn(), fetch: vi.fn(), error: vi.fn() }));
vi.mock('../createur/ai', () => ({ aiEnabled: () => true, endpoint: (p: string) => `https://mistral.test${p}` }));
vi.mock('../http/rate-limit', () => ({ takeRateLimit: mocks.limit, clientIp: async () => '203.0.113.7' }));
vi.mock('./repository', () => ({
  listPublishedProducts: async () => [{ id: 'coffret', name: 'Coffret', categoryName: 'Coffrets', subName: '', usages: ['naissance'], summary: '' }],
}));
const { searchByUsageAction } = await import('./usage-actions');

const answer = (content: string) => ({ ok: true, json: async () => ({ choices: [{ message: { content } }] }) });

beforeEach(() => {
  vi.stubGlobal('fetch', mocks.fetch);
  vi.spyOn(console, 'error').mockImplementation(mocks.error);
  process.env.MISTRAL_API_KEY = 'cle-de-test';
  mocks.limit.mockResolvedValue(true);
});
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it('entrée invalide : rien d’appelé', async () => {
  for (const input of [{ q: 'ab' }, { q: 'x'.repeat(201) }, { q: 'cadeau', x: 1 }, null, 'cadeau']) {
    expect(await searchByUsageAction(input)).toEqual({ ids: null });
  }
  expect(mocks.limit).not.toHaveBeenCalled();
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it('limite par visiteur ou pour le site atteinte : pas d’appel à Mistral', async () => {
  mocks.limit.mockResolvedValueOnce(false);
  expect(await searchByUsageAction({ q: 'cadeau de naissance' })).toEqual({ ids: null });
  mocks.limit.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  expect(await searchByUsageAction({ q: 'cadeau de naissance' })).toEqual({ ids: null });
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it('réponse : pièces du catalogue seulement', async () => {
  mocks.fetch.mockResolvedValue(answer(JSON.stringify({ ids: ['inventee', 'coffret'] })));
  expect(await searchByUsageAction({ q: 'cadeau pour un baptême' })).toEqual({ ids: ['coffret'] });
});

it('Mistral en panne : null, journal sans la phrase', async () => {
  mocks.fetch.mockRejectedValue(new Error('réseau'));
  expect(await searchByUsageAction({ q: 'cadeau pour le baptême de Léon' })).toEqual({ ids: null });
  expect(JSON.stringify(mocks.error.mock.calls)).not.toContain('Léon');
});
