'use server';

// Inscription à la newsletter (formulaire du pied de page) et désinscription (lien de l'e-mail). Écrites côté
// serveur seulement, e-mail validé par Zod, date de consentement gardée. Même réponse que l'adresse soit déjà inscrite
// ou non (aucune information sur les inscrits). Nouvelle inscription : e-mail de confirmation avec lien de
// désinscription, puis ajout à la liste Brevo de la lettre mensuelle (après la réponse). Limite : 5 inscriptions par
// adresse IP et par heure (l'e-mail de confirmation ne peut pas servir à écrire en masse à des inconnus).
// App Check : étape 9.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { after } from 'next/server';
import { z } from 'zod';
import { emailSchema } from '../auth/policy';
import { COLLECTIONS } from '../db/schema';
import { sendEmail, syncNewsletterContact } from '../emails/sender';
import { loadEmailTexts } from '../emails/settings';
import { newsletterWelcome } from '../emails/templates';
import { featuredPiece } from '../emails/featured';
import { adminDb } from '../firebase/admin';
import { siteOrigin } from '../http/origin';
import { clientIp, takeRateLimit } from '../http/rate-limit';

const input = z.strictObject({
  email: emailSchema,
  website: z.string().max(200).optional(), // champ piège invisible : rempli seulement par les robots
});

export type NewsletterResult = 'ok' | 'invalide' | 'erreur';
const SUBSCRIBE_LIMIT_PER_IP = 5;

const docIdOf = (email: string) => createHash('sha256').update(email).digest('hex');

export async function subscribeNewsletterAction(raw: unknown): Promise<NewsletterResult> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return 'invalide';
  if (parsed.data.website) return 'ok'; // robot : réponse identique, rien d'écrit
  const email = parsed.data.email;
  try {
    if (!(await takeRateLimit('newsletter-ip', await clientIp(), SUBSCRIBE_LIMIT_PER_IP, 3600_000))) return 'ok';
    const col = adminDb().collection(COLLECTIONS.newsletter);
    // Identifiant = empreinte de l'e-mail : une seule inscription par adresse, même en cas de double envoi.
    const ref = col.doc(docIdOf(email));
    const existing = await col.where('email', '==', email).limit(1).get(); // anciennes inscriptions (autre identifiant)
    if (!existing.empty) return 'ok';
    const token = randomBytes(24).toString('hex'); // lien de désinscription (gardé côté serveur seulement)
    const created = await ref.create({ email, source: 'footer_site', consentAt: FieldValue.serverTimestamp(), unsubscribeToken: token })
      .then(() => true, (e: { code?: number }) => { if (e?.code !== 6) throw e; return false; }); // 6 = déjà inscrite
    if (created) {
      const origin = await siteOrigin();
      const url = `${origin}/newsletter/desinscription?id=${ref.id}&t=${token}`;
      after(async () => {
        const piece = await featuredPiece(origin).catch(() => null); // sans photo : l'e-mail part quand même
        const text = (await loadEmailTexts()).newsletter;
        if ((await sendEmail(newsletterWelcome(email, url, origin, piece, { text }))) === 'echec') console.error('newsletter : confirmation non envoyée');
        await syncNewsletterContact(email, true);
      });
    }
    return 'ok';
  } catch {
    console.error('newsletter : inscription impossible'); // jamais l'adresse dans le journal
    return 'erreur';
  }
}

const unsubscribeInput = z.strictObject({ id: z.string().regex(/^[a-f0-9]{64}$/), t: z.string().regex(/^[a-f0-9]{48}$/) });

// Désinscription : inscription effacée (RGPD) et adresse retirée de la liste Brevo. Même réponse si le lien est faux
// ou déjà utilisé.
export async function unsubscribeNewsletterAction(raw: unknown): Promise<'ok' | 'erreur'> {
  const parsed = unsubscribeInput.safeParse(raw);
  if (!parsed.success) return 'ok';
  try {
    const ref = adminDb().collection(COLLECTIONS.newsletter).doc(parsed.data.id);
    const snap = await ref.get();
    const token = snap.get('unsubscribeToken');
    if (typeof token !== 'string' || token.length !== parsed.data.t.length
      || !timingSafeEqual(Buffer.from(token), Buffer.from(parsed.data.t))) return 'ok';
    const email = String(snap.get('email') ?? '');
    await ref.delete();
    if (email) await syncNewsletterContact(email, false);
    return 'ok';
  } catch {
    console.error('newsletter : désinscription impossible');
    return 'erreur';
  }
}
