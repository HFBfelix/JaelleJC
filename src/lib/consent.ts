// Consentement cookies (RGPD) : aucun traceur tant que le visiteur n'a pas cliqué « Tout accepter ».
// Même clé et mêmes valeurs que l'ancien site, pour que les choix déjà faits soient conservés.
export const CONSENT_KEY = 'jaellejc-cookies';

export type Consent = 'all' | 'none';

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

export function readConsent(storage: ReadableStorage | undefined): Consent | null {
  try {
    const value = storage?.getItem(CONSENT_KEY);
    return value === 'all' || value === 'none' ? value : null;
  } catch {
    // Stockage bloqué (navigation privée stricte) : on considère qu'aucun choix n'a été fait.
    return null;
  }
}

export function writeConsent(storage: WritableStorage | undefined, choice: Consent): void {
  try {
    storage?.setItem(CONSENT_KEY, choice);
  } catch {
    // Choix non mémorisé : le bandeau réapparaîtra à la prochaine visite, aucun traceur chargé.
  }
}

export function shouldLoadAnalytics(consent: Consent | null): boolean {
  return consent === 'all';
}
