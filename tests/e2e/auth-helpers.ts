// Comptes fictifs des parcours de connexion (émulateur Authentication uniquement, adresses « @exemple.test »).
import { randomUUID } from 'node:crypto';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const PROJECT = process.env.FIREBASE_PROJECT_ID ?? 'demo-jaellejc';
// Mot de passe tiré au hasard à chaque lancement (aucune valeur fixe dans le dépôt).
export const PASSWORD = `e2e-${randomUUID()}`;

function auth() {
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Parcours de connexion : émulateur Authentication requis (FIREBASE_AUTH_EMULATOR_HOST).');
  const app = getApps()[0] ?? initializeApp({ projectId: PROJECT });
  return getAuth(app);
}

export const newEmail = () => `e2e-${randomUUID().slice(0, 8)}@exemple.test`;

export async function createUser({ admin = false, password = PASSWORD, emailVerified = true } = {}) {
  const email = newEmail();
  const user = await auth().createUser({ email, password, emailVerified });
  if (admin) await auth().setCustomUserClaims(user.uid, { admin: true });
  return { uid: user.uid, email, password };
}

// Retrait du droit admin sans révocation des sessions (comme une modification faite dans la console).
export const removeAdminClaim = (uid: string) => auth().setCustomUserClaims(uid, {});

// Lien de connexion envoyé par l'émulateur : reconstruit sur la page du site (comme le ferait le lien de l'e-mail).
export async function signInLinkFor(email: string, baseURL: string, retour = '/compte') {
  const res = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/oobCodes`);
  const { oobCodes } = (await res.json()) as { oobCodes: { email: string; oobCode: string; requestType: string }[] };
  const code = oobCodes.filter((c) => c.email === email && c.requestType === 'EMAIL_SIGNIN').at(-1);
  if (!code) throw new Error('Aucun lien de connexion envoyé.');
  return `${baseURL}/connexion/lien?retour=${encodeURIComponent(retour)}&apiKey=demo-key&oobCode=${code.oobCode}&mode=signIn&lang=fr`;
}

export async function resetCodesFor(email: string) {
  const res = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/oobCodes`);
  const { oobCodes } = (await res.json()) as { oobCodes: { email: string; requestType: string }[] };
  return oobCodes.filter((c) => c.email === email && c.requestType === 'PASSWORD_RESET').length;
}

// Nettoyage : seuls les comptes « e2e-…@exemple.test » sont supprimés.
export async function cleanUsers() {
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) return;
  const uids: string[] = [];
  let page: string | undefined;
  do {
    const list = await auth().listUsers(1000, page);
    uids.push(...list.users.filter((u) => /^e2e-[a-f0-9-]+@exemple\.test$/.test(u.email ?? '')).map((u) => u.uid));
    page = list.pageToken;
  } while (page);
  if (uids.length) await auth().deleteUsers(uids);
}
