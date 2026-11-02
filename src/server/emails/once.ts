// E-mail envoyé une seule fois (bienvenue, relances de panier…) : une marque est posée en transaction dans
// `emailMarks` avant l'envoi (deux connexions simultanées n'envoient qu'un e-mail), puis retirée si l'envoi échoue
// (nouvel essai possible plus tard). Collection serveur uniquement (règles : tout refusé).
import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '../db/schema';
import { adminDb } from '../firebase/admin';
import { sendEmail, type SendResult } from './sender';
import type { EmailMessage } from './templates';

export async function sendOnce(key: string, uid: string | null, build: () => EmailMessage): Promise<SendResult | 'deja-envoye'> {
  const ref = adminDb().collection(COLLECTIONS.emailMarks).doc(key);
  const taken = await adminDb().runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return false;
    tx.create(ref, { uid, at: FieldValue.serverTimestamp() });
    return true;
  });
  if (!taken) return 'deja-envoye';
  const result = await sendEmail(build()).catch(() => 'echec' as const);
  if (result !== 'envoye') await ref.delete();
  return result;
}
