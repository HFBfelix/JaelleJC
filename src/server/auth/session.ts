// Session serveur : cookie de session Firebase (HttpOnly, Secure, SameSite=Lax), vérifié à chaque requête,
// révocations comprises. Le droit administrateur vient de la revendication `admin: true`, jamais du navigateur.
import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { adminAuth } from '../firebase/admin';
import { serverCookieOptions } from '../http/cookies';
import { RECENT_SIGN_IN_SECONDS, SESSION_COOKIE, SESSION_DAYS, isRecent } from './policy';

export type SessionUser = { uid: string; email: string | null; admin: boolean; authTime: number };

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value || value.length > 4096) return null;
  try {
    const d = await adminAuth().verifySessionCookie(value, true);
    return { uid: d.uid, email: d.email ?? null, admin: d.admin === true && d.email_verified === true, authTime: d.auth_time };
  } catch {
    return null; // expirée, révoquée, falsifiée : simplement déconnecté
  }
});

// Échange un jeton d'identité tout frais (connexion faite à l'instant dans le navigateur) contre un cookie de session.
// Adresse vérifiée exigée : un compte créé directement par l'API Firebase avec un mot de passe (sans passer par
// le lien) n'ouvre aucune session. Les comptes concernés de l'ancien site passent une fois par le lien.
export async function openSession(idToken: string): Promise<SessionUser | null> {
  try {
    const d = await adminAuth().verifyIdToken(idToken, true);
    if (!isRecent(d.auth_time, RECENT_SIGN_IN_SECONDS) || d.email_verified !== true) return null;
    const expiresIn = SESSION_DAYS * 24 * 60 * 60 * 1000;
    const value = await adminAuth().createSessionCookie(idToken, { expiresIn });
    (await cookies()).set(SESSION_COOKIE, value, serverCookieOptions((await headers()).get('host'), expiresIn / 1000));
    return { uid: d.uid, email: d.email ?? null, admin: d.admin === true && d.email_verified === true, authTime: d.auth_time };
  } catch {
    return null;
  }
}

// Déconnexion : cookie supprimé et sessions du compte révoquées (un cookie copié ailleurs ne sert plus).
export async function closeSession() {
  const user = await getSessionUser();
  (await cookies()).delete(SESSION_COOKIE);
  if (user) await adminAuth().revokeRefreshTokens(user.uid);
}

// Le droit est relu sur le compte à chaque requête : un retrait prend effet tout de suite, même sans révocation.
export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user?.admin) return null;
  try {
    const account = await adminAuth().getUser(user.uid);
    return account.customClaims?.admin === true && account.emailVerified && !account.disabled ? user : null;
  } catch {
    return null;
  }
}

// Après un changement de mot de passe : toutes les sessions du compte sont fermées, celle-ci comprise.
export async function closeAllSessions(uid: string) {
  await adminAuth().revokeRefreshTokens(uid);
  (await cookies()).delete(SESSION_COOKIE);
}
