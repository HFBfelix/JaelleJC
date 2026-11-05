// Réservation d'un e-mail de commande avant l'envoi (relecture de sécurité 7bis, F4) : deux appels rapprochés
// (double clic sur « Renvoyer », webhook et changement de statut) n'envoient jamais deux fois le même e-mail.
// Pur, testé sans base ; la réservation elle-même est faite en transaction dans `notify.ts`.

// Verrou abandonné (coupure pendant l'envoi) : ignoré après 10 minutes, l'e-mail redevient envoyable.
export const EMAIL_LOCK_MS = 10 * 60 * 1000;

export function mayReserve(status: unknown, lockedAtMs: number | null, nowMs: number): boolean {
  if (status !== 'en_attente') return false;
  return lockedAtMs === null || nowMs - lockedAtMs >= EMAIL_LOCK_MS;
}
