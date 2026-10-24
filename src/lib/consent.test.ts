import { describe, expect, it } from 'vitest';
import { CONSENT_KEY, readConsent, shouldLoadAnalytics, writeConsent } from './consent';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

const throwingStorage = {
  getItem: () => { throw new Error('bloqué'); },
  setItem: () => { throw new Error('bloqué'); },
};

describe('consentement cookies', () => {
  it("reprend la clé de l'ancien site", () => {
    expect(CONSENT_KEY).toBe('jaellejc-cookies');
  });

  it("aucun choix tant que le visiteur n'a pas répondu", () => {
    expect(readConsent(memoryStorage())).toBeNull();
    expect(readConsent(undefined)).toBeNull();
  });

  it('relit les deux choix possibles', () => {
    expect(readConsent(memoryStorage({ [CONSENT_KEY]: 'all' }))).toBe('all');
    expect(readConsent(memoryStorage({ [CONSENT_KEY]: 'none' }))).toBe('none');
  });

  it('ignore une valeur inconnue ou trafiquée', () => {
    expect(readConsent(memoryStorage({ [CONSENT_KEY]: 'yes' }))).toBeNull();
    expect(readConsent(memoryStorage({ [CONSENT_KEY]: '<script>' }))).toBeNull();
  });

  it('stockage bloqué : pas de choix, pas d’erreur', () => {
    expect(readConsent(throwingStorage)).toBeNull();
    expect(() => writeConsent(throwingStorage, 'all')).not.toThrow();
  });

  it('mémorise le choix', () => {
    const storage = memoryStorage();
    writeConsent(storage, 'none');
    expect(storage.data.get(CONSENT_KEY)).toBe('none');
  });

  it('Analytics seulement après « Tout accepter »', () => {
    expect(shouldLoadAnalytics('all')).toBe(true);
    expect(shouldLoadAnalytics('none')).toBe(false);
    expect(shouldLoadAnalytics(null)).toBe(false);
  });
});
