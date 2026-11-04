// Coordonnées et salutation (décisions de Jaelle, 2026-11-04) : civilité + nom, sinon prénom, sinon « Bonjour » ;
// profil complet = civilité, prénom, nom, téléphone français, tous obligatoires.
import { describe, expect, it } from 'vitest';
import { fullName, greetingName, isProfileComplete, profileInput, readProfile, salutation } from './greeting';

const p = (civilite: string | null, prenom: string, nom: string, telephone = '') => readProfile({ civilite, prenom, nom, telephone });

describe('salutation', () => {
  it.each([
    [p('madame', 'Camille', 'Martin'), 'Bonjour Madame Martin'],
    [p('monsieur', 'Louis', 'de La Tour'), 'Bonjour Monsieur de La Tour'],
    [p('mademoiselle', 'Lou', 'Bernard'), 'Bonjour Mademoiselle Bernard'],
    [p('non-precise', 'Alex', 'Morel'), 'Bonjour Alex'],
    [p('madame', 'Camille', ''), 'Bonjour Camille'],
    [p(null, 'Camille', 'Martin'), 'Bonjour Camille'],
    [p(null, '', ''), 'Bonjour'],
  ])('%o → « %s »', (profile, expected) => expect(salutation(profile)).toBe(expected));

  it('pas de profil : « Bonjour »', () => {
    expect(salutation(null)).toBe('Bonjour');
    expect(greetingName(null)).toBeNull();
  });
});

describe('coordonnées obligatoires', () => {
  const valid = { civilite: 'madame', prenom: 'Camille', nom: 'Martin', telephone: '+33612345678' };

  it('saisie complète acceptée, téléphone ramené à +33', () => {
    expect(profileInput.parse({ ...valid, telephone: '06 12 34 56 78' }).telephone).toBe('+33612345678');
    expect(profileInput.parse({ ...valid, telephone: '+33 6 12 34 56 78' }).telephone).toBe('+33612345678');
  });

  it.each([
    ['sans civilité', { ...valid, civilite: null }],
    ['civilité inconnue', { ...valid, civilite: 'docteur' }],
    ['sans prénom', { ...valid, prenom: '' }],
    ['sans nom', { ...valid, nom: ' ' }],
    ['sans téléphone', { ...valid, telephone: '' }],
    ['téléphone étranger', { ...valid, telephone: '+44 20 7946 0000' }],
    ['balise', { ...valid, prenom: '<b>C</b>' }],
  ])('%s : refusé', (_, input) => expect(profileInput.safeParse(input).success).toBe(false));

  it('profil complet seulement avec les quatre informations ; téléphone abîmé en base = incomplet', () => {
    expect(isProfileComplete(readProfile(valid))).toBe(true);
    expect(isProfileComplete(readProfile({ ...valid, civilite: null }))).toBe(false);
    expect(isProfileComplete(readProfile({ ...valid, telephone: '12' }))).toBe(false);
    expect(isProfileComplete(readProfile(undefined))).toBe(false);
    expect(fullName(readProfile(valid))).toBe('Camille Martin');
  });
});
