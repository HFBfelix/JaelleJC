// Réservation d'un e-mail de commande : un seul envoi à la fois ; verrou abandonné repris après 10 minutes.
import { expect, it } from 'vitest';
import { EMAIL_LOCK_MS, mayReserve } from './email-lock';

const now = Date.UTC(2026, 10, 5, 12, 0, 0);

it('en attente et libre : réservable', () => {
  expect(mayReserve('en_attente', null, now)).toBe(true);
});

it('déjà envoyé, champ absent ou valeur inconnue : jamais', () => {
  for (const status of ['envoye', undefined, null, 'envoi']) expect(mayReserve(status, null, now)).toBe(false);
});

it('réservé par un autre appel il y a moins de 10 minutes : non ; plus ancien (coupure) : oui', () => {
  expect(mayReserve('en_attente', now - 1000, now)).toBe(false);
  expect(mayReserve('en_attente', now - EMAIL_LOCK_MS + 1, now)).toBe(false);
  expect(mayReserve('en_attente', now - EMAIL_LOCK_MS, now)).toBe(true);
});
