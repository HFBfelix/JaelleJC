// Bienvenue : seulement pour un compte créé dans les dernières 24 heures (pas pour les comptes de l'ancien site),
// à adresse vérifiée, jamais pour l'administratrice.
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), sendOnce: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../firebase/admin', () => ({ adminAuth: () => ({ getUser: mocks.getUser }) }));
vi.mock('../emails/once', () => ({ sendOnce: mocks.sendOnce }));
vi.mock('../emails/settings', () => ({ loadEmailTexts: async () => ({ bienvenue: {} }) }));
vi.mock('../account/profile', () => ({ greetingFor: async () => null }));
const { isNewAccount, sendWelcome } = await import('./welcome');

beforeEach(() => vi.clearAllMocks());

it('compte créé il y a moins de 24 heures : nouveau ; plus ancien ou date inconnue : non', () => {
  const now = Date.parse('2026-11-01T12:00:00Z');
  expect(isNewAccount('Sun, 01 Nov 2026 11:00:00 GMT', now)).toBe(true);
  expect(isNewAccount('Fri, 30 Oct 2026 11:00:00 GMT', now)).toBe(false);
  expect(isNewAccount(undefined, now)).toBe(false);
});

const account = (over: Record<string, unknown> = {}) => ({
  email: 'camille@exemple.test', emailVerified: true, customClaims: {}, metadata: { creationTime: new Date().toUTCString() }, ...over,
});

it('nouveau compte vérifié : bienvenue envoyée une fois (marque par compte)', async () => {
  mocks.getUser.mockResolvedValue(account());
  mocks.sendOnce.mockResolvedValue('envoye');
  await sendWelcome('u1', 'http://localhost:3000');
  expect(mocks.sendOnce).toHaveBeenCalledWith('bienvenue_u1', 'u1', expect.any(Function));
});

it('adresse non vérifiée, administratrice ou sans e-mail : rien n’est envoyé', async () => {
  for (const over of [{ emailVerified: false }, { customClaims: { admin: true } }, { email: undefined }]) {
    mocks.getUser.mockResolvedValue(account(over));
    await sendWelcome('u1', 'http://localhost:3000');
  }
  expect(mocks.sendOnce).not.toHaveBeenCalled();
});
