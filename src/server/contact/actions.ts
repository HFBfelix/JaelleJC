'use server';

// Formulaire de contact (page /contact, étape 8a) : écrit par le serveur dans `contacts` (lu dans l'Atelier, onglet
// Messages). Entrée validée par Zod, champ piège pour les robots, 5 messages par adresse IP et par heure, jamais
// l'adresse ni le message dans le journal. App Check : étape 9.
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { emailSchema } from '../auth/policy';
import { COLLECTIONS } from '../db/schema';
import { adminDb } from '../firebase/admin';
import { clientIp, takeRateLimit } from '../http/rate-limit';

const oneLine = (max: number) => z.string().trim().min(1).max(max).regex(/^[^\r\n<>]*$/);
const input = z.strictObject({
  name: oneLine(100),
  email: emailSchema,
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(200).optional(), // champ piège invisible : rempli seulement par les robots
});

export type ContactResult = 'ok' | 'invalide' | 'limite' | 'erreur';

export async function sendContactAction(raw: unknown): Promise<ContactResult> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return 'invalide';
  if (parsed.data.website) return 'ok'; // robot : réponse identique, rien d'écrit
  try {
    if (!(await takeRateLimit('contact-ip', await clientIp(), 5, 3600_000))) return 'limite';
    const { name, email, message } = parsed.data;
    await adminDb().collection(COLLECTIONS.contacts).add({
      name, email, subject: 'Demande d’information', message, createdAt: FieldValue.serverTimestamp(), status: 'unread',
    });
    return 'ok';
  } catch {
    console.error('contact : message non enregistré'); // jamais l'adresse ni le message dans le journal
    return 'erreur';
  }
}
