// Textes des e-mails enregistrés par Jaelle (document serveur `settings/emailTexts`, fermé au navigateur par les
// règles). Lecture impossible : textes par défaut, l'e-mail part quand même.
import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import type { z } from 'zod';
import { COLLECTIONS } from '../db/schema';
import { audit } from '../createur/products';
import { adminDb } from '../firebase/admin';
import { defaultTexts, resolveTexts, type EmailKind, type EmailTexts, type emailTextInput } from './texts';

const ref = () => adminDb().collection(COLLECTIONS.settings).doc('emailTexts');

export async function loadEmailTexts(): Promise<EmailTexts> {
  try {
    return resolveTexts((await ref().get()).data());
  } catch {
    console.error('e-mails : textes enregistrés illisibles, textes par défaut');
    return defaultTexts();
  }
}

export async function saveEmailText(uid: string, input: z.infer<typeof emailTextInput>): Promise<void> {
  const { kind, ...text } = input;
  await ref().set({ [kind]: text, updatedAt: FieldValue.serverTimestamp(), updatedBy: uid }, { merge: true });
  await audit(uid, 'reglages.email-texte', kind);
}

export async function resetEmailText(uid: string, kind: EmailKind): Promise<void> {
  await ref().set({ [kind]: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp(), updatedBy: uid }, { merge: true });
  await audit(uid, 'reglages.email-texte-origine', kind);
}
