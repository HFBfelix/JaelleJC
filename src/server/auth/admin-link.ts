// Lien de connexion à l'espace créatrice (décision de Jaelle, 2026-10-30) : envoyé par le serveur, et seulement aux
// comptes administrateurs. Toute autre adresse (cliente, inconnue) ne reçoit rien ; la page affiche la même réponse
// dans tous les cas. Limites : 3 demandes par adresse et 10 par adresse IP, par quart d'heure.
import 'server-only';
import { sendEmail } from '../emails/sender';
import { signInLink } from '../emails/templates';
import { adminAuth } from '../firebase/admin';

export const LINK_LIMIT_PER_EMAIL = 3;
export const LINK_LIMIT_PER_IP = 10;
export const LINK_WINDOW_MS = 15 * 60 * 1000;

// Envoi effectif, après la réponse à la page (même durée de réponse, que l'adresse soit autorisée ou non).
export async function sendAdminLink(email: string, origin: string): Promise<void> {
  let admin = false;
  try {
    admin = (await adminAuth().getUserByEmail(email)).customClaims?.admin === true;
  } catch {
    return; // adresse inconnue : rien n'est envoyé
  }
  if (!admin) return;
  const url = `${origin}/connexion/lien?retour=${encodeURIComponent('/createur')}`;
  const link = await adminAuth().generateSignInWithEmailLink(email, { url, handleCodeInApp: true });
  if ((await sendEmail(signInLink(email, link))) !== 'envoye') console.error('espace créatrice : lien de connexion non envoyé');
}
