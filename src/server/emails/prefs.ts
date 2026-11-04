// « Ne plus recevoir ces messages » (relances de panier, colis arrivé, avis) : préférence par adresse e-mail, gardée
// sous forme hachée dans `emailPrefs` (serveur uniquement). Le lien de chaque message porte un jeton aléatoire propre
// à l'adresse ; un faux lien ne change rien. Les e-mails de commande (confirmation, expédition) ne sont pas concernés.
import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '../db/schema';
import { adminDb } from '../firebase/admin';

export const emailKey = (email: string) => createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
const ref = (key: string) => adminDb().collection(COLLECTIONS.emailPrefs).doc(key);

export async function isOptedOut(email: string): Promise<boolean> {
  return (await ref(emailKey(email)).get()).get('optOut') === true;
}

// Lien de désinscription de ces messages (jeton créé au premier envoi, puis réutilisé).
export async function optOutUrl(email: string, origin: string): Promise<string> {
  const key = emailKey(email);
  const token = await adminDb().runTransaction(async (tx) => {
    const current = (await tx.get(ref(key))).get('token');
    if (typeof current === 'string') return current;
    const created = randomBytes(24).toString('hex');
    tx.set(ref(key), { token: created, optOut: false, createdAt: FieldValue.serverTimestamp() }, { merge: true });
    return created;
  });
  return `${origin}/emails/preferences?e=${key}&t=${token}`;
}

// Clic sur « Ne plus recevoir ces messages » : vrai si le lien est valable (sinon rien ne change).
export async function optOut(key: string, token: string): Promise<boolean> {
  const snap = await ref(key).get();
  const stored = snap.get('token');
  if (typeof stored !== 'string' || stored.length !== token.length || !timingSafeEqual(Buffer.from(stored), Buffer.from(token))) return false;
  await ref(key).update({ optOut: true, optOutAt: FieldValue.serverTimestamp() });
  return true;
}
