// Envoi des e-mails par l'API Brevo (décision de Jaelle, 2026-10-31) : clé `BREVO_API_KEY` limitée aux e-mails
// transactionnels et aux contacts (jamais aux campagnes), expéditeur du domaine authentifié jaellejc.com.
// Sans clé : rien n'est envoyé (« non-configure »), les commandes gardent leurs e-mails « en_attente ».
// Serveur Brevo de remplacement (tests de parcours) : accepté seulement sur l'ordinateur de développement.
import 'server-only';
import type { EmailMessage } from './templates';

export type SendResult = 'envoye' | 'non-configure' | 'echec';

export const SENDER = { name: 'Jaelle & JC', email: 'contact@jaellejc.com' };
const TIMEOUT_MS = 10_000;
const env = (name: string) => process.env[name]?.trim() || null;

function endpoint() {
  const fake = env('BREVO_API_URL');
  if (fake) {
    if (env('VERCEL_ENV') || !env('FIRESTORE_EMULATOR_HOST')) throw new Error('BREVO_API_URL réservé aux tests locaux.');
    return `${fake.replace(/\/$/, '')}/v3/smtp/email`;
  }
  return 'https://api.brevo.com/v3/smtp/email';
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const key = env('BREVO_API_KEY');
  if (!key) return 'non-configure';
  const url = endpoint(); // erreur de configuration : remontée, jamais confondue avec un refus de Brevo
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: SENDER, replyTo: SENDER, to: [{ email: message.to }],
        subject: message.subject, htmlContent: message.html, textContent: message.text,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    if (res.ok) return 'envoye';
    console.error(`e-mail : refusé par Brevo (${res.status})`); // ni adresse ni contenu dans le journal
    return 'echec';
  } catch {
    console.error('e-mail : Brevo injoignable');
    return 'echec';
  }
}

export const shopNotificationAddress = () => process.env.SHOP_NOTIFICATION_EMAIL?.trim() || 'contact@jaellejc.com';
