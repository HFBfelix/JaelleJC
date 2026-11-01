'use server';

// Server Actions de connexion. Le navigateur se connecte avec Firebase (lien ou mot de passe), puis envoie ici
// son jeton d'identité, échangé contre un cookie de session. Entrées validées avec Zod ; mêmes réponses quel que
// soit le motif d'échec (aucune information sur l'existence d'un compte).
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { z } from 'zod';
import { attachGuestCart } from '../cart/service';
import { adminAuth } from '../firebase/admin';
import { siteOrigin } from '../http/origin';
import { clientIp, takeRateLimit } from '../http/rate-limit';
import { LINK_LIMIT_PER_EMAIL, LINK_LIMIT_PER_IP, LINK_WINDOW_MS, sendAdminLink } from './admin-link';
import { SENSITIVE_ACTION_SECONDS, emailSchema, isRecent, passwordSchema, safeReturn } from './policy';
import { closeAllSessions, closeSession, getSessionUser, openSession } from './session';

// Espace créatrice : « Recevoir mon lien ». Même réponse pour toute adresse valide (autorisée ou non, limite
// atteinte ou non) ; l'e-mail part après la réponse, seulement vers un compte administrateur.
export async function requestAdminLinkAction(input: unknown): Promise<{ status: 'ok' | 'invalide' }> {
  const parsed = z.strictObject({ email: emailSchema }).safeParse(input);
  if (!parsed.success) return { status: 'invalide' };
  const { email } = parsed.data;
  try {
    const [byEmail, byIp] = await Promise.all([
      takeRateLimit('lien-createur-email', email, LINK_LIMIT_PER_EMAIL, LINK_WINDOW_MS),
      takeRateLimit('lien-createur-ip', await clientIp(), LINK_LIMIT_PER_IP, LINK_WINDOW_MS),
    ]);
    if (byEmail && byIp) {
      const origin = await siteOrigin();
      after(() => sendAdminLink(email, origin).catch(() => console.error('espace créatrice : lien de connexion non envoyé')));
    }
  } catch {
    console.error('espace créatrice : demande de lien impossible'); // même réponse à l'écran
  }
  return { status: 'ok' };
}

const signInInput = z.strictObject({ idToken: z.string().min(1).max(4096), retour: z.string().max(40).optional() });

export type SignInResult = { ok: true; redirect: string; admin: boolean } | { ok: false };

export async function signInAction(input: unknown): Promise<SignInResult> {
  const parsed = signInInput.safeParse(input);
  if (!parsed.success) return { ok: false };
  const user = await openSession(parsed.data.idToken);
  if (!user) return { ok: false };
  try {
    await attachGuestCart(user.uid);
  } catch {
    console.error('connexion : fusion du panier impossible'); // la connexion reste valable
  }
  return { ok: true, redirect: safeReturn(parsed.data.retour), admin: user.admin };
}

export async function signOutAction(): Promise<void> {
  try {
    await closeSession();
  } catch {
    console.error('déconnexion : révocation impossible'); // le cookie est déjà supprimé
  }
  redirect('/');
}

export type PasswordResult = 'reconnexion' | 'invalide' | 'erreur';

// Choix ou changement du mot de passe, depuis le compte : connexion de moins de 10 minutes exigée.
// Ensuite, toutes les sessions sont fermées (un appareil volé ou oublié perd l'accès) : nouvelle connexion.
export async function setPasswordAction(input: unknown): Promise<PasswordResult> {
  const parsed = z.strictObject({ password: passwordSchema }).safeParse(input);
  if (!parsed.success) return 'invalide';
  const user = await getSessionUser();
  if (!user || !isRecent(user.authTime, SENSITIVE_ACTION_SECONDS)) return 'reconnexion';
  try {
    await adminAuth().updateUser(user.uid, { password: parsed.data.password });
    await closeAllSessions(user.uid);
  } catch {
    console.error('compte : mot de passe non modifié');
    return 'erreur';
  }
  redirect('/connexion?retour=/compte&info=mot-de-passe'); // hors du try : la redirection est une exception de Next
}
