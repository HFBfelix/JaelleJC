// E-mails d'une commande : confirmation (ou excuses si remboursée) à la cliente, alerte à la boutique.
// Chaque e-mail n'est marqué « envoye » qu'après succès ; sinon il reste « en_attente » (renvoi possible).
// Un échec d'envoi n'annule jamais la commande.
import 'server-only';
import type { NewOrder } from '../checkout/logic';
import { COLLECTIONS } from '../db/schema';
import { sendEmail, shopNotificationAddress } from '../emails/sender';
import { orderConfirmation, shopNotification, stockApology } from '../emails/templates';
import { adminDb } from '../firebase/admin';

export async function notifyOrder(orderId: string, order: NewOrder) {
  const ref = adminDb().collection(COLLECTIONS.orders).doc(orderId);
  const pending = order.emails ?? { cliente: 'en_attente', boutique: 'en_attente' };
  const jobs = [
    ['cliente', () => (order.status === 'refunded' ? stockApology(order) : orderConfirmation(order))],
    ['boutique', () => shopNotification(order, shopNotificationAddress())],
  ] as const;
  for (const [field, build] of jobs) {
    if (pending[field] === 'envoye') continue;
    try {
      if ((await sendEmail(build())) === 'envoye') await ref.update({ [`emails.${field}`]: 'envoye' });
    } catch {
      console.error(`commande : e-mail « ${field} » non envoyé`); // ni adresse ni contenu dans le journal
    }
  }
}
