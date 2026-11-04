// E-mail de bienvenue à la création d'un compte (lien de connexion ou mot de passe), envoyé après la première
// connexion. Seulement pour un compte créé il y a moins de 24 heures : les comptes de l'ancien site ne le reçoivent
// pas à leur prochaine connexion. Jamais deux fois (marque `emailMarks/bienvenue_<uid>`). Pas pour l'administratrice.
import 'server-only';
import { sendOnce } from '../emails/once';
import { loadEmailTexts } from '../emails/settings';
import { welcome } from '../emails/templates';
import { adminAuth } from '../firebase/admin';

export const WELCOME_WINDOW_MS = 24 * 3600 * 1000;

export const isNewAccount = (creationTime: string | undefined, now = Date.now()) =>
  !!creationTime && now - new Date(creationTime).getTime() < WELCOME_WINDOW_MS;

export async function sendWelcome(uid: string, origin: string): Promise<void> {
  const user = await adminAuth().getUser(uid);
  if (!user.email || user.customClaims?.admin === true || !isNewAccount(user.metadata.creationTime)) return;
  const text = (await loadEmailTexts()).bienvenue;
  const result = await sendOnce(`bienvenue_${uid}`, uid, () => welcome(user.email!, origin, { text }));
  if (result === 'echec') console.error('compte : e-mail de bienvenue non envoyé');
}
