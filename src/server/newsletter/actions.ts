'use server';

// Inscription à la newsletter (formulaire du pied de page). Écrite côté serveur seulement, e-mail validé par Zod,
// date de consentement gardée. Même réponse que l'adresse soit déjà inscrite ou non (aucune information sur les
// inscrits). Envoi vers Brevo : étape 7bis ; App Check et limitation de débit : étape 9.
import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { emailSchema } from '../auth/policy';
import { COLLECTIONS } from '../db/schema';
import { adminDb } from '../firebase/admin';

const input = z.strictObject({
  email: emailSchema,
  website: z.string().max(200).optional(), // champ piège invisible : rempli seulement par les robots
});

export type NewsletterResult = 'ok' | 'invalide' | 'erreur';

export async function subscribeNewsletterAction(raw: unknown): Promise<NewsletterResult> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return 'invalide';
  if (parsed.data.website) return 'ok'; // robot : réponse identique, rien d'écrit
  const email = parsed.data.email;
  try {
    const col = adminDb().collection(COLLECTIONS.newsletter);
    // Identifiant = empreinte de l'e-mail : une seule inscription par adresse, même en cas de double envoi.
    const ref = col.doc(createHash('sha256').update(email).digest('hex'));
    const existing = await col.where('email', '==', email).limit(1).get(); // anciennes inscriptions (autre identifiant)
    if (existing.empty) {
      await ref.create({ email, source: 'footer_site', consentAt: FieldValue.serverTimestamp() }).catch((e: { code?: number }) => {
        if (e?.code !== 6) throw e; // 6 = déjà existant : déjà inscrite
      });
    }
    return 'ok';
  } catch {
    console.error('newsletter : inscription impossible'); // jamais l'adresse dans le journal
    return 'erreur';
  }
}
