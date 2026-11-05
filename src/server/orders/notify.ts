// E-mails d'une commande : confirmation (ou excuses si remboursée) à la cliente, alerte à la boutique, puis
// « en préparation » et « colis en route » quand Jaelle fait avancer la commande dans l'espace créatrice.
// Chaque e-mail n'est marqué « envoye » qu'après succès ; sinon il reste « en_attente » (renvoi possible).
// Avant l'envoi, il est réservé en transaction (`emailLocks`) : deux appels rapprochés n'envoient qu'une fois.
// Un échec d'envoi n'annule jamais la commande ni le changement de statut.
import 'server-only';
import { FieldValue, Timestamp, type DocumentReference } from 'firebase-admin/firestore';
import type { NewOrder, OrderEmails } from '../checkout/logic';
import { COLLECTIONS, order as orderSchema } from '../db/schema';
import { sendEmail, shopNotificationAddress } from '../emails/sender';
import { greetingFor } from '../account/profile';
import { personalParagraph, piecesFacts } from '../emails/personal';
import { loadEmailTexts } from '../emails/settings';
import { orderConfirmation, orderPreparing, orderShipped, shopNotification, stockApology, type EmailMessage } from '../emails/templates';
import { defaultTexts, type EmailTexts } from '../emails/texts';
import { adminDb } from '../firebase/admin';
import { mayReserve } from './email-lock';

type Field = keyof OrderEmails;
// Commande créée par le webhook (sans suivi) ou relue en base (suivi posé à l'expédition).
export type MailableOrder = Omit<NewOrder, 'tracking'> & { tracking: { carrier: string; number: string; url: string } | null };

// E-mail de chaque champ « en_attente » ; null si la commande ne permet pas de l'écrire (suivi absent…).
// Textes réglés dans l'Atelier ; paragraphe personnalisé seulement pour « en préparation » et « colis en route » ;
// salutation tirée du compte de la personne qui a commandé (`greeting`), jamais de l'adresse de livraison.
export function emailFor(field: Field, order: MailableOrder, texts: EmailTexts = defaultTexts(), personal: string | null = null, greeting: string | null = null): EmailMessage | null {
  switch (field) {
    case 'cliente': return order.status === 'refunded' ? stockApology(order, { text: texts.excuses, greeting }) : orderConfirmation(order, { text: texts.confirmation, greeting });
    case 'boutique': return shopNotification(order, shopNotificationAddress());
    case 'preparation': return orderPreparing(order, { text: texts.preparation, personal, greeting });
    case 'expedition': return order.tracking ? orderShipped({ ...order, tracking: order.tracking }, { text: texts.expedition, personal, greeting }) : null;
  }
}

async function personalFor(field: Field, order: MailableOrder, texts: EmailTexts): Promise<string | null> {
  if ((field !== 'preparation' && field !== 'expedition') || !texts[field].personal) return null;
  return personalParagraph(field, await piecesFacts(order.items).catch(() => []));
}

const FIELDS: Field[] = ['cliente', 'boutique', 'preparation', 'expedition'];

async function sendPending(orderId: string, order: MailableOrder) {
  const ref = adminDb().collection(COLLECTIONS.orders).doc(orderId);
  const pending: Partial<OrderEmails> = order.emails ?? { cliente: 'en_attente', boutique: 'en_attente' };
  if (!FIELDS.some((f) => pending[f] === 'en_attente')) return;
  const texts = await loadEmailTexts();
  const greeting = await greetingFor(order.userId);
  for (const field of FIELDS) {
    if (pending[field] !== 'en_attente') continue;
    if (!(await reserve(ref, field))) continue; // déjà en cours d'envoi par un autre appel, ou déjà envoyé
    let sent = false;
    try {
      const message = emailFor(field, order, texts, await personalFor(field, order, texts), greeting);
      sent = !!message && (await sendEmail(message)) === 'envoye';
    } catch {
      console.error(`commande : e-mail « ${field} » non envoyé`); // ni adresse ni contenu dans le journal
    }
    // Envoyé : marqué ; sinon : reste « en_attente » (renvoi possible). Le verrou est levé dans les deux cas.
    await ref.update({ ...(sent ? { [`emails.${field}`]: 'envoye' } : {}), [`emailLocks.${field}`]: FieldValue.delete() })
      .catch(() => console.error(`commande : état de l'e-mail « ${field} » non enregistré`));
  }
}

// Réserve l'e-mail en transaction : il doit être encore « en_attente » en base et ne pas être en cours d'envoi.
async function reserve(ref: DocumentReference, field: Field): Promise<boolean> {
  try {
    return await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const locked = snap.get(`emailLocks.${field}`) as Timestamp | undefined;
      if (!mayReserve(snap.get(`emails.${field}`), locked ? locked.toMillis() : null, Date.now())) return false;
      tx.update(ref, { [`emailLocks.${field}`]: Timestamp.now() });
      return true;
    });
  } catch {
    console.error(`commande : e-mail « ${field} » non réservé`);
    return false;
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
