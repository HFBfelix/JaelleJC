// Connexion Firebase dans le navigateur (seul usage du SDK client, CLAUDE.md §3). Rien n'est gardé dans le
// navigateur : persistance en mémoire, et déconnexion Firebase dès que le serveur a ouvert sa session.
import { getApps, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator, inMemoryPersistence, initializeAuth, isSignInWithEmailLink, sendPasswordResetEmail,
  sendSignInLinkToEmail, signInWithEmailAndPassword, signInWithEmailLink, signOut, type Auth, type UserCredential,
} from 'firebase/auth';

export type FirebaseClientConfig = { apiKey: string; authDomain: string; projectId: string; emulatorHost: string | null };

const EMAIL_KEY = 'jaellejc-email-connexion';
let instance: Auth | null = null;

function auth(config: FirebaseClientConfig): Auth {
  if (instance) return instance;
  const app = getApps()[0] ?? initializeApp({ apiKey: config.apiKey, authDomain: config.authDomain, projectId: config.projectId });
  instance = initializeAuth(app, { persistence: inMemoryPersistence });
  instance.languageCode = 'fr';
  if (config.emulatorHost) connectAuthEmulator(instance, `http://${config.emulatorHost}`, { disableWarnings: true });
  return instance;
}

// Adresse gardée le temps d'ouvrir le lien (méthode prévue par Firebase), une heure au plus : au-delà, ou
// sur un autre appareil, elle est redemandée.
const EMAIL_MAX_AGE_MS = 60 * 60 * 1000;
const remember = (email: string) => {
  try { localStorage.setItem(EMAIL_KEY, JSON.stringify({ email, at: Date.now() })); } catch { /* stockage refusé */ }
};
export const forgetEmail = () => { try { localStorage.removeItem(EMAIL_KEY); } catch { /* stockage refusé */ } };
export const rememberedEmail = (): string | null => {
  try {
    const saved = JSON.parse(localStorage.getItem(EMAIL_KEY) ?? 'null') as { email?: unknown; at?: unknown } | null;
    if (typeof saved?.email === 'string' && typeof saved.at === 'number' && Date.now() - saved.at < EMAIL_MAX_AGE_MS) return saved.email;
  } catch { /* stockage refusé ou valeur illisible */ }
  forgetEmail();
  return null;
};

// Jeton d'identité à envoyer au serveur, puis plus rien dans le navigateur.
async function tokenOf(a: Auth, credential: UserCredential) {
  const idToken = await credential.user.getIdToken();
  await signOut(a);
  return idToken;
}

// Lien de connexion : la réponse est la même que le compte existe ou non (aucune erreur remontée à l'écran).
export async function sendLink(config: FirebaseClientConfig, email: string, retour: string) {
  remember(email);
  const url = `${window.location.origin}/connexion/lien?retour=${encodeURIComponent(retour)}`;
  try {
    await sendSignInLinkToEmail(auth(config), email, { url, handleCodeInApp: true });
  } catch {
    /* même message à l'écran */
  }
}

export const isLink = (config: FirebaseClientConfig, href: string) => isSignInWithEmailLink(auth(config), href);

export async function finishLink(config: FirebaseClientConfig, email: string, href: string) {
  const a = auth(config);
  const token = await tokenOf(a, await signInWithEmailLink(a, email, href));
  forgetEmail();
  return token;
}

export async function passwordSignIn(config: FirebaseClientConfig, email: string, password: string) {
  const a = auth(config);
  return tokenOf(a, await signInWithEmailAndPassword(a, email, password));
}

export async function resetPassword(config: FirebaseClientConfig, email: string) {
  try {
    await sendPasswordResetEmail(auth(config), email);
  } catch {
    /* même message à l'écran */
  }
}
