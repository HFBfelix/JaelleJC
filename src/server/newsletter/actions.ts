'use server';

// Inscription à la newsletter (formulaire du pied de page), confirmation (lien de l'e-mail) et désinscription. Écrites
// côté serveur seulement, e-mail validé par Zod. Même réponse que l'adresse soit déjà inscrite ou non (aucune
// information sur les inscrits). Limite : 5 demandes par adresse IP et par heure. App Check : étape 9.
// Double confirmation (décision de Jaelle, 2026-11-05) : la demande reste « en_attente » 48 heures ; seul le clic sur
// le bouton de l'e-mail date le consentement, envoie l'e-mail de bienvenue et ajoute l'adresse à la liste Brevo.
// Une adresse tapée par un tiers ne reçoit donc qu'un seul e-mail (au plus un par 48 heures), sans être inscrite.
// Inscriptions d'avant (sans statut) : déjà confirmées.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { after } from 'next/server';
import { z } from 'zod';
import { emailSchema } from '../auth/policy';
import { COLLECTIONS } from '../db/schema';
import { sendEmail, syncNewsletterContact } from '../emails/sender';
import { loadEmailTexts } from '../emails/settings';
import { newsletterConfirmRequest, newsletterWelcome } from '../emails/templates';
import { featuredPiece } from '../emails/featured';
import { adminDb } from '../firebase/admin';
import { siteOrigin } from '../http/origin';
import { clientIp, takeRateLimit } from '../http/rate-limit';

const input = z.strictObject({
  email: emailSchema,
  website: z.string().max(200).optional(), // champ piège invisible : rempli seulement par les robots
  source: z.enum(['footer_site', 'page_newsletter']).optional(), // pied de page (par défaut) ou page /newsletter
});

export type NewsletterResult = 'ok' | 'invalide' | 'erreur';
const SUBSCRIBE_LIMIT_PER_IP = 5;
const CONFIRM_WINDOW_MS = 48 * 3600 * 1000; // validité du lien de confirmation (TTL `newsletter.expiresAt`)
const PENDING = 'en_attente';

const docIdOf = (email: string) => createHash('sha256').update(email).digest('hex');
const newToken = () => randomBytes(24).toString('hex'); // 48 caractères, gardé côté serveur seulement
const sameToken = (stored: unknown, given: string) =>
  typeof stored === 'string' && stored.length === given.length && timingSafeEqual(Buffer.from(stored), Buffer.from(given));

export async function subscribeNewsletterAction(raw: unknown): Promise<NewsletterResult> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return 'invalide';
  if (parsed.data.website) return 'ok'; // robot : réponse identique, rien d'écrit
  const email = parsed.data.email;
  try {
    if (!(await takeRateLimit('newsletter-ip', await clientIp(), SUBSCRIBE_LIMIT_PER_IP, 3600_000))) return 'ok';
    const col = adminDb().collection(COLLECTIONS.newsletter);
    // Identifiant = empreinte de l'e-mail : une seule demande par adresse, même en cas de double envoi.
    const ref = col.doc(docIdOf(email));
    const existing = await col.where('email', '==', email).limit(1).get(); // anciennes inscriptions (autre identifiant)
    if (!existing.empty && existing.docs[0]!.id !== ref.id) return 'ok';
    const confirmToken = newToken();
    const pending = {
      status: PENDING, confirmToken, requestedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + CONFIRM_WINDOW_MS),
    };
    // Nouvelle demande, ou demande précédente expirée sans confirmation : (re)lancée. Inscrite ou demande en cours : rien.
    const send = await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        tx.create(ref, { email, source: parsed.data.source ?? 'footer_site', unsubscribeToken: newToken(), ...pending });
        return true;
      }
      const expiresAt = snap.get('expiresAt') as Timestamp | undefined;
      if (snap.get('status') !== PENDING || (expiresAt && expiresAt.toMillis() > Date.now())) return false;
      tx.update(ref, pending);
      return true;
    });
    if (send) {
      const origin = await siteOrigin();
      const url = `${origin}/newsletter/confirmation?id=${ref.id}&t=${confirmToken}`;
      after(async () => {
        const text = (await loadEmailTexts()).newsletterConfirmation;
        if ((await sendEmail(newsletterConfirmRequest(email, url, origin, { text }))) === 'echec') console.error('newsletter : demande de confirmation non envoyée');
      });
    }
    return 'ok';
  } catch {
    console.error('newsletter : inscription impossible'); // jamais l'adresse dans le journal
    return 'erreur';
  }
}

const linkInput = z.strictObject({ id: z.string().regex(/^[a-f0-9]{64}$/), t: z.string().regex(/^[a-f0-9]{48}$/) });

// Confirmation (bouton de la page ouverte par le lien de l'e-mail : un lien seul pourrait être ouvert par l'antivirus
// de la messagerie). Lien faux, expiré ou déjà utilisé : « invalide », sans rien dire de l'adresse.
export async function confirmNewsletterAction(raw: unknown): Promise<'ok' | 'invalide' | 'erreur'> {
  const parsed = linkInput.safeParse(raw);
  if (!parsed.success) return 'invalide';
  try {
    const ref = adminDb().collection(COLLECTIONS.newsletter).doc(parsed.data.id);
    // En transaction : deux clics rapprochés ne confirment (et n'envoient la bienvenue) qu'une fois.
    const confirmed = await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const expiresAt = snap.get('expiresAt') as Timestamp | undefined;
      if (snap.get('status') !== PENDING || !sameToken(snap.get('confirmToken'), parsed.data.t)
        || !expiresAt || expiresAt.toMillis() <= Date.now()) return null;
      tx.update(ref, {
        status: FieldValue.delete(), confirmToken: FieldValue.delete(), expiresAt: FieldValue.delete(),
        consentAt: FieldValue.serverTimestamp(),
      });
      return { email: String(snap.get('email') ?? ''), unsubscribeToken: String(snap.get('unsubscribeToken') ?? '') };
    });
    if (!confirmed?.email) return 'invalide';
    const origin = await siteOrigin();
    const url = `${origin}/newsletter/desinscription?id=${ref.id}&t=${confirmed.unsubscribeToken}`;
    after(async () => {
      const piece = await featuredPiece(origin).catch(() => null); // sans photo : l'e-mail part quand même
      const text = (await loadEmailTexts()).newsletter;
      if ((await sendEmail(newsletterWelcome(confirmed.email, url, origin, piece, { text }))) === 'echec') console.error('newsletter : bienvenue non envoyée');
      await syncNewsletterContact(confirmed.email, true);
    });
    return 'ok';
  } catch {
    console.error('newsletter : confirmation impossible');
    return 'erreur';
  }
}

// Désinscription : inscription (ou demande en attente) effacée (RGPD) et adresse retirée de la liste Brevo. Même
// réponse si le lien est faux ou déjà utilisé.
export async function unsubscribeNewsletterAction(raw: unknown): Promise<'ok' | 'erreur'> {
  const parsed = linkInput.safeParse(raw);
  if (!parsed.success) return 'ok';
  try {
    const ref = adminDb().collection(COLLECTIONS.newsletter).doc(parsed.data.id);
    const snap = await ref.get();
    if (!sameToken(snap.get('unsubscribeToken'), parsed.data.t)) return 'ok';
    const email = String(snap.get('email') ?? '');
    await ref.delete();
    if (email) await syncNewsletterContact(email, false);
    return 'ok';
  } catch {
    console.error('newsletter : désinscription impossible');
    return 'erreur';
  }
}
