// Envois automatiques : rien sans droit admin ; lien de désinscription faux ou trafiqué sans effet.
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), run: vi.fn(), optOut: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../auth/session', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('../firebase/admin', () => ({ adminDb: () => { throw new Error('base touchée'); } }));
vi.mock('../http/origin', () => ({ siteOrigin: async () => 'https://www.jaellejc.com' }));
vi.mock('./automations', () => ({ runAutomations: mocks.run }));
vi.mock('./prefs', () => ({ optOut: mocks.optOut }));
const actions = await import('./automation-actions');

beforeEach(() => vi.clearAllMocks());

it('cliente ordinaire ou anonyme : ni envoi ni réglage', async () => {
  mocks.requireAdmin.mockResolvedValue(null);
  expect(await actions.runAutomationsAction()).toEqual({ status: 'connexion' });
  expect(await actions.saveArrivalDaysAction({ arrivalDays: 3 })).toEqual({ status: 'connexion' });
  expect(mocks.run).not.toHaveBeenCalled();
});

it('délai hors bornes ou champ en trop : refusé', async () => {
  mocks.requireAdmin.mockResolvedValue({ uid: 'a' });
  for (const input of [{ arrivalDays: 0 }, { arrivalDays: 31 }, { arrivalDays: 2.5 }, { arrivalDays: 3, x: 1 }]) {
    expect(await actions.saveArrivalDaysAction(input)).toEqual({ status: 'invalide' });
  }
});

it('lien de désinscription mal formé : même réponse, rien de changé', async () => {
  for (const input of [{ e: 'x', t: 'y' }, { e: 'a'.repeat(64) }, null]) expect(await actions.optOutAction(input)).toBe('ok');
  expect(mocks.optOut).not.toHaveBeenCalled();
  expect(await actions.optOutAction({ e: 'a'.repeat(64), t: 'b'.repeat(48) })).toBe('ok');
  expect(mocks.optOut).toHaveBeenCalledWith('a'.repeat(64), 'b'.repeat(48));
});
