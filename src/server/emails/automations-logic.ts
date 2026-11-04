// Envois automatiques quotidiens (étape 7bis, lot 4), règles pures testées sans base :
// - relances d'un panier non payé (comptes seulement) à J+1, J+3 et J+5 après la dernière activité ; la dernière
//   prévient que la sélection sera retirée 2 jours plus tard (panier gardé 7 jours) ;
// - « votre colis est-il bien arrivé ? » N jours après l'expédition (réglable, 3 par défaut), si la commande n'est
//   pas déjà marquée livrée ;
// - avis à J+14 après la livraison (ou, sans date de livraison, après l'expédition + N jours).
// Un envoi par étape et par commande ; jamais d'envoi en retard groupé (seule l'étape la plus avancée part).
export const REMINDER_DAYS = [1, 3, 5] as const;
export const REVIEW_DAYS = 14;
export const ARRIVAL_DAYS_DEFAULT = 3;
const DAY_MS = 24 * 3600 * 1000;

const daysSince = (from: Date, now: Date) => (now.getTime() - from.getTime()) / DAY_MS;

// Étape de relance due (1, 2 ou 3) pour un panier inactif depuis `lastActivity` ; 0 si aucune.
export function reminderStage(lastActivity: Date, now: Date): 0 | 1 | 2 | 3 {
  const d = daysSince(lastActivity, now);
  return d >= REMINDER_DAYS[2] ? 3 : d >= REMINDER_DAYS[1] ? 2 : d >= REMINDER_DAYS[0] ? 1 : 0;
}

// Étape à envoyer : la plus avancée due, seulement si elle n'est pas déjà partie (ni une plus avancée).
export const stageToSend = (due: number, alreadySent: number) => (due > alreadySent ? due : 0);

export type OrderDates = { status: string; shippedAt: Date | null; deliveredAt: Date | null };

export const arrivalDue = (o: OrderDates, now: Date, days = ARRIVAL_DAYS_DEFAULT) =>
  o.status === 'shipped' && !!o.shippedAt && daysSince(o.shippedAt, now) >= days;

export function reviewDue(o: OrderDates, now: Date, arrivalDays = ARRIVAL_DAYS_DEFAULT) {
  if (o.status !== 'shipped' && o.status !== 'delivered') return false;
  const received = o.deliveredAt ?? (o.shippedAt ? new Date(o.shippedAt.getTime() + arrivalDays * DAY_MS) : null);
  return !!received && daysSince(received, now) >= REVIEW_DAYS;
}
