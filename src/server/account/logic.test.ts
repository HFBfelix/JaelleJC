// Espace client : validation des adresses et conditions de suppression du compte.
import { describe, expect, it } from 'vitest';
import { deletionBlocker, isComplete, saveAddressInput } from './logic';

const valid = { label: 'Maison', name: 'Camille Martin', line1: '1 rue A', line2: '', zipCode: '75001', city: 'Paris', phone: '' };

describe('adresse saisie', () => {
  it('adresse complète : acceptée (nouvelle ou modifiée)', () => {
    expect(saveAddressInput.safeParse({ address: valid }).success).toBe(true);
    expect(saveAddressInput.safeParse({ id: 'AbC_12-x', address: valid }).success).toBe(true);
  });

  it.each([
    ['code postal à 4 chiffres', { address: { ...valid, zipCode: '7500' } }],
    ['code postal avec lettres', { address: { ...valid, zipCode: '2A004' } }],
    ['nom vide', { address: { ...valid, name: '  ' } }],
    ['rue trop longue', { address: { ...valid, line1: 'x'.repeat(201) } }],
    ['pays imposé par le navigateur', { address: { ...valid, country: 'BE' } }],
    ['champ inconnu', { address: { ...valid, admin: true } }],
    ['identifiant de chemin', { id: '../autre-uid', address: valid }],
    ['uid fourni par le navigateur', { uid: 'autre', address: valid }],
    ['rien', null],
  ])('%s : refusée', (_, input) => {
    expect(saveAddressInput.safeParse(input).success).toBe(false);
  });

  it('adresse migrée incomplète : pas proposée au paiement', () => {
    expect(isComplete({ id: 'a', ...valid })).toBe(true);
    expect(isComplete({ id: 'a', ...valid, zipCode: '' })).toBe(false);
  });
});

describe('suppression du compte', () => {
  const now = Date.parse('2026-10-29T12:00:00Z');
  const ttl = 30 * 60;

  it('aucune commande en cours ni paiement ouvert : permise', () => {
    expect(deletionBlocker(['delivered', 'refunded', 'cancelled'], [{ status: 'traite', createdAtMs: now - 1000 }], ttl, now)).toBeNull();
  });

  it.each(['paid', 'preparing', 'shipped'])('commande « %s » : refusée', (status) => {
    expect(deletionBlocker(['delivered', status], [], ttl, now)).toBe('commande-en-cours');
  });

  it('paiement ouvert depuis moins de 30 minutes : refusée', () => {
    expect(deletionBlocker([], [{ status: undefined, createdAtMs: now - 10 * 60_000 }], ttl, now)).toBe('paiement-en-cours');
    expect(deletionBlocker([], [{ status: undefined, createdAtMs: null }], ttl, now)).toBe('paiement-en-cours');
  });

  it('paiement ouvert il y a plus de 30 minutes, ou expiré : permise', () => {
    expect(deletionBlocker([], [{ status: undefined, createdAtMs: now - 31 * 60_000 }], ttl, now)).toBeNull();
    expect(deletionBlocker([], [{ status: 'expire', createdAtMs: now }], ttl, now)).toBeNull();
  });
});
