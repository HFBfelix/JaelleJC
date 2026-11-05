// Onglet Clientes : recherche (casse, accents), comptes jamais supprimés depuis l'Atelier, saisie de la suppression.
import { expect, it } from 'vitest';
import { DELETE_WORD, deleteClientInput, deletionRefusal, matchesClient } from './clients-logic';

it('recherche par e-mail ou par nom, sans tenir compte de la casse ni des accents', () => {
  const c = { email: 'camille.martin@exemple.fr', name: 'Élodie Martin' };
  for (const q of ['', 'CAMILLE', 'martin@', 'elodie', 'Élodie  martin']) expect(matchesClient(c, q)).toBe(true);
  for (const q of ['dupont', 'x@y']) expect(matchesClient(c, q)).toBe(false);
});

it('administratrice ou soi-même : jamais supprimable depuis l’Atelier', () => {
  expect(deletionRefusal({ uid: 'a', admin: true }, 'moi')).toBe('admin');
  expect(deletionRefusal({ uid: 'moi', admin: false }, 'moi')).toBe('admin');
  expect(deletionRefusal({ uid: 'c', admin: false }, 'moi')).toBeNull();
});

it('suppression : mot exact en capitales et identifiant propre, rien d’autre', () => {
  for (const uid of ['abc123', 'ancien_compte-1']) expect(deleteClientInput.safeParse({ uid, word: DELETE_WORD }).success).toBe(true);
  for (const input of [
    { uid: 'abc123', word: 'supprimer' }, { uid: 'abc123', word: 'SUPPRIMER ' }, { uid: 'abc123' }, { uid: '../users', word: DELETE_WORD }, { uid: 'a'.repeat(129), word: DELETE_WORD },
    { uid: 'a/b', word: DELETE_WORD }, { uid: 'a.b', word: DELETE_WORD }, { uid: '', word: DELETE_WORD }, { uid: 'abc', word: DELETE_WORD, x: 1 }, null,
  ]) expect(deleteClientInput.safeParse(input).success).toBe(false);
});
