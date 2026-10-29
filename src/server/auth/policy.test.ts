import { describe, expect, it } from 'vitest';
import { PASSWORD_MIN, emailSchema, isRecent, passwordSchema, safeReturn } from './policy';

describe('retour après connexion : liste fermée', () => {
  it.each(['/panier', '/compte', '/createur'])('%s accepté', (path) => expect(safeReturn(path)).toBe(path));

  it.each([
    undefined, '', '/', '//evil.example', 'https://evil.example', '/panier?x=1', '/compte/../createur',
    '/\\evil.example', 'javascript:alert(1)', '/PANIER', ['/panier'],
  ])('%s refusé → /compte', (value) => expect(safeReturn(value)).toBe('/compte'));
});

describe('connexion récente', () => {
  const now = Date.UTC(2026, 9, 29, 12, 0, 0);
  it('moins de 5 minutes : récente ; plus : non', () => {
    expect(isRecent(now / 1000 - 299, 300, now)).toBe(true);
    expect(isRecent(now / 1000 - 301, 300, now)).toBe(false);
  });
});

describe('mot de passe et e-mail', () => {
  it(`au moins ${PASSWORD_MIN} caractères, 128 au plus`, () => {
    expect(passwordSchema.safeParse('a'.repeat(9)).success).toBe(false);
    expect(passwordSchema.safeParse('a'.repeat(10)).success).toBe(true);
    expect(passwordSchema.safeParse('a'.repeat(129)).success).toBe(false);
  });

  it('e-mail normalisé, trop long ou invalide refusé', () => {
    expect(emailSchema.parse('  Cliente@Exemple.FR ')).toBe('cliente@exemple.fr');
    expect(emailSchema.safeParse('pas-un-email').success).toBe(false);
    expect(emailSchema.safeParse(`${'a'.repeat(250)}@x.fr`).success).toBe(false);
  });
});
