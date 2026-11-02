// Bienvenue : seulement pour un compte créé dans les dernières 24 heures (pas pour les comptes de l'ancien site).
import { expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('../firebase/admin', () => ({ adminAuth: () => { throw new Error('non utilisé'); } }));
vi.mock('../emails/once', () => ({ sendOnce: vi.fn() }));
const { isNewAccount } = await import('./welcome');

it('compte créé il y a moins de 24 heures : nouveau ; plus ancien ou date inconnue : non', () => {
  const now = Date.parse('2026-11-01T12:00:00Z');
  expect(isNewAccount('Sun, 01 Nov 2026 11:00:00 GMT', now)).toBe(true);
  expect(isNewAccount('Fri, 30 Oct 2026 11:00:00 GMT', now)).toBe(false);
  expect(isNewAccount(undefined, now)).toBe(false);
});
