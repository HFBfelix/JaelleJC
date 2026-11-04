// Salutation (décision de Jaelle, 2026-11-04) : civilité + nom, sinon prénom, sinon « Bonjour ».
import { expect, it } from 'vitest';
import { greetingName, readProfile, salutation } from './greeting';

it.each([
  [{ civilite: 'madame', prenom: 'Camille', nom: 'Martin' }, 'Bonjour Madame Martin'],
  [{ civilite: 'monsieur', prenom: 'Louis', nom: 'de La Tour' }, 'Bonjour Monsieur de La Tour'],
  [{ civilite: 'mademoiselle', prenom: 'Lou', nom: 'Bernard' }, 'Bonjour Mademoiselle Bernard'],
  [{ civilite: 'non-precise', prenom: 'Alex', nom: 'Morel' }, 'Bonjour Alex'],
  [{ civilite: 'madame', prenom: 'Camille', nom: '' }, 'Bonjour Camille'],
  [{ civilite: null, prenom: 'Camille', nom: 'Martin' }, 'Bonjour Camille'],
  [{ civilite: null, prenom: '', nom: '' }, 'Bonjour'],
] as const)('%o → « %s »', (p, expected) => expect(salutation(p)).toBe(expected));

it('pas de profil : « Bonjour »', () => {
  expect(salutation(null)).toBe('Bonjour');
  expect(greetingName(null)).toBeNull();
});

it('profil abîmé en base : champs ignorés, jamais d’erreur', () => {
  expect(readProfile({ civilite: 'docteur', prenom: 42, nom: 'Martin' })).toEqual({ civilite: null, prenom: '', nom: 'Martin' });
  expect(readProfile(undefined)).toEqual({ civilite: null, prenom: '', nom: '' });
});
