// E-mails d'une commande : confirmation (ou excuses si remboursée) à la cliente, alerte à la boutique, puis
// « en préparation » et « colis en route » quand Jaelle fait avancer la commande dans l'espace créatrice.
// Chaque e-mail n'est marqué « envoye » qu'après succès ; sinon il reste « en_attente » (renvoi possible).
// Un échec d'envoi n'annule jamais la commande ni le changement de statut.
import 'server-only';
import type { NewOrder, OrderEmails } from '../checkout/logic';
import { COLLECTIONS, order as orderSchema } from '../db/schema';
import { sendEmail, shopNotificationAddress } from '../emails/sender';
import { orderConfirmation, orderPreparing, orderShipped, shopNotification, stockApology, type EmailMessage } from '../emails/templates';
import { adminDb } from '../firebase/admin';

type Field = keyof OrderEmails;
// Commande créée par le webhook (sans suivi) ou relue en base (suivi posé à l'expédition).
export type MailableOrder = Omit<NewOrder, 'tracking'> & { tracking: { carrier: string; number: string; url: string } | null };

// E-mail de chaque champ « en_attente » ; null si la commande ne permet pas de l'écrire (suivi absent…).
export function emailFor(field: Field, order: MailableOrder): EmailMessage | null {
  switch (field) {
    case 'cliente': return order.status === 'refunded' ? stockApology(order) : orderConfirmation(order);
    case 'boutique': return shopNotification(order, shopNotificationAddress());
    case 'preparation': return orderPreparing(order);
    case 'expedition': return order.tracking ? orderShipped({ ...order, tracking: order.tracking }) : null;
  }
}

const FIELDS: Field[] = ['cliente', 'boutique', 'preparation', 'expedition'];

async function sendPending(orderId: string, order: MailableOrder) {
  const ref = adminDb().collection(COLLECTIONS.orders).doc(orderId);
  const pending: Partial<OrderEmails> = order.emails ?? { cliente: 'en_attente', boutique: 'en_attente' };
  for (const field of FIELDS) {
    if (pending[field] !== 'en_attente') continue;
    try {
      const message = emailFor(field, order);
      if (message && (await sendEmail(message)) === 'envoye') await ref.update({ [`emails.${field}`]: 'envoye' });
    } catch {
      console.error(`commande : e-mail « ${field} » non envoyé`); // ni adresse ni contenu dans le journal
    }
  }
}

// Commande tout juste créée par le webhook.
export const notifyOrder = (orderId: string, order: NewOrder) => sendPending(orderId, order);

// Commande relue en base (changement de statut, renvoi) : seules les commandes de la refonte (avec référence)
// reçoivent des e-mails ; les commandes migrées de l'ancien site sont ignorées.
export async function sendPendingEmails(orderId: string): Promise<void> {
  const snap = await adminDb().collection(COLLECTIONS.orders).doc(orderId).get();
  const parsed = orderSchema.safeParse(snap.data());
  if (!parsed.success || !parsed.data.reference) return;
  await sendPending(orderId, parsed.data as unknown as MailableOrder);
}
