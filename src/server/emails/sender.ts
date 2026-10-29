// Envoi des e-mails. Expéditeur pas encore choisi par Jaelle (2026-10-29) : aucun envoi pour l'instant,
// les commandes gardent leurs e-mails « en_attente » pour un envoi ultérieur. Brancher ici le service retenu.
import 'server-only';
import type { EmailMessage } from './templates';

export type SendResult = 'envoye' | 'non-configure' | 'echec';

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  void message;
  return 'non-configure';
}

export const shopNotificationAddress = () => process.env.SHOP_NOTIFICATION_EMAIL?.trim() || 'contact@jaellejc.com';
