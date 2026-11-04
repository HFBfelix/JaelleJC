// Textes des e-mails : rien sans droit admin ; saisie invalide ou mot entre accolades inconnu refusés.
import { beforeEach, expect, it, vi } from 'vitest';
import { defaultText } from './texts';

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), save: vi.fn(), reset: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../auth/session', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('./settings', () => ({ saveEmailText: mocks.save, resetEmailText: mocks.reset }));
const actions = await import('./text-actions');

const valid = { kind: 'avis', ...defaultText('avis') };
beforeEach(() => vi.clearAllMocks());

it('cliente ordinaire ou anonyme : rien d’enregistré ni de rétabli', async () => {
  mocks.requireAdmin.mockResolvedValue(null);
  expect(await actions.saveEmailTextAction(valid)).toEqual({ status: 'connexion' });
  expect(await actions.resetEmailTextAction({ kind: 'avis' })).toEqual({ status: 'connexion' });
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.reset).not.toHaveBeenCalled();
});

it('saisie invalide : refusée', async () => {
  mocks.requireAdmin.mockResolvedValue({ uid: 'a' });
  for (const input of [
    { ...valid, kind: 'lien-connexion' }, { ...valid, subject: '' }, { ...valid, subject: 'A\r\nBcc: x@y.z' },
    { ...valid, body: 'x'.repeat(2001) }, { ...valid, personal: 'oui' }, { ...valid, x: 1 }, null,
  ]) expect(await actions.saveEmailTextAction(input)).toEqual({ status: 'invalide' });
  expect(await actions.resetEmailTextAction({ kind: 'boutique' })).toEqual({ status: 'invalide' });
  expect(mocks.save).not.toHaveBeenCalled();
});

it('mot entre accolades inconnu : refusé, nommé', async () => {
  mocks.requireAdmin.mockResolvedValue({ uid: 'a' });
  expect(await actions.saveEmailTextAction({ ...valid, body: 'Bonjour {prénom}' })).toEqual({ status: 'variables', names: ['prénom'] });
  expect(mocks.save).not.toHaveBeenCalled();
});

it('administratrice : enregistré à son nom', async () => {
  mocks.requireAdmin.mockResolvedValue({ uid: 'a' });
  expect(await actions.saveEmailTextAction(valid)).toEqual({ status: 'ok' });
  expect(mocks.save).toHaveBeenCalledWith('a', valid);
  expect(await actions.resetEmailTextAction({ kind: 'avis' })).toEqual({ status: 'ok' });
  expect(mocks.reset).toHaveBeenCalledWith('a', 'avis');
});
