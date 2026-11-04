// Recherche par usage, action publique : entrée invalide → le service n'est pas appelé ; erreur → null, sans la
// phrase dans le journal. (Limites, mémoire, compteurs et alertes : recherche-usage.spec.ts, sur l'émulateur.)
import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ search: vi.fn(), error: vi.fn() }));
vi.mock('./usage-service', () => ({ searchByUsage: mocks.search }));
const { searchByUsageAction } = await import('./usage-actions');

afterEach(() => vi.clearAllMocks());

it('entrée invalide : rien d’appelé', async () => {
  for (const input of [{ q: 'ab' }, { q: '   ab   ' }, { q: 'x'.repeat(201) }, { q: 'cadeau', x: 1 }, { q: 42 }, null, 'cadeau']) {
    expect(await searchByUsageAction(input)).toEqual({ ids: null });
  }
  expect(mocks.search).not.toHaveBeenCalled();
});

it('phrase valide : transmise au service, nettoyée des espaces', async () => {
  mocks.search.mockResolvedValue(['coffret']);
  expect(await searchByUsageAction({ q: '  cadeau pour un baptême ' })).toEqual({ ids: ['coffret'] });
  expect(mocks.search).toHaveBeenCalledWith('cadeau pour un baptême');
});

it('erreur interne : null, journal sans la phrase', async () => {
  vi.spyOn(console, 'error').mockImplementation(mocks.error);
  mocks.search.mockRejectedValue(new Error('base indisponible'));
  expect(await searchByUsageAction({ q: 'cadeau pour le baptême de Léon' })).toEqual({ ids: null });
  expect(JSON.stringify(mocks.error.mock.calls)).not.toContain('Léon');
});
