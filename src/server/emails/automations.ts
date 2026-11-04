// Envois automatiques quotidiens (lot 4) : relances de panier (comptes seulement), « colis arrivé ? », avis à J+14.
// Lancés chaque matin par Vercel (production) ou à la main depuis l'Atelier (Réglages). Rejouables sans doublon :
// chaque envoi est marqué (panier : étape envoyée pour cette période d'activité ; commande : champ `emails.*`).
// Les adresses qui ont demandé à ne plus recevoir ces messages sont ignorées.
import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { readOffers } from '../cart/repository';
import { COLLECTIONS } from '../db/schema';
import { adminAuth, adminDb } from '../firebase/admin';
import { ARRIVAL_DAYS_DEFAULT, arrivalDue, reminderStage, reviewDue, stageToSend } from './automations-logic';
import { personalParagraph, piecesFacts } from './personal';
import { isOptedOut, optOutUrl } from './prefs';
import { sendEmail } from './sender';
import { loadEmailTexts } from './settings';
import { arrivalCheck, cartReminder, reviewRequest } from './templates';
import type { EmailTexts } from './texts';

export type AutomationSummary = { relances: number; arrivees: number; avis: number; echecs: number };

const date = (v: unknown) => (v instanceof Timestamp ? v.toDate() : null);

export async function readArrivalDays(): Promise<number> {
  const v = (await adminDb().collection(COLLECTIONS.settings).doc('emails').get()).get('arrivalDays');
  return Number.isInteger(v) && v >= 1 && v <= 30 ? v : ARRIVAL_DAYS_DEFAULT;
}

async function cartReminders(origin: string, now: Date, texts: EmailTexts, s: AutomationSummary) {
  const carts = await adminDb().collection(COLLECTIONS.carts).where('userId', '!=', null).get();
  for (const c of carts.docs) {
    try {
      const uid = c.get('userId') as string;
      const items = (c.get('items') ?? []) as { productId: string; variantId: string }[];
      const updatedAt = date(c.get('updatedAt'));
      const expiresAt = date(c.get('expiresAt'));
      if (!items.length || !updatedAt || (expiresAt && expiresAt <= now)) continue;
      const due = reminderStage(updatedAt, now);
      if (!due) continue;
      // Marque de la période d'activité : une nouvelle visite (date d'activité changée) recommence les relances.
      const mark = adminDb().collection(COLLECTIONS.emailMarks).doc(`panier_${uid}_${updatedAt.getTime()}`);
      const user = await adminAuth().getUser(uid).catch(() => null);
      if (!user?.email || (await isOptedOut(user.email))) continue;
      const offers = await readOffers(items);
      const lines = items.flatMap((i) => {
        const o = offers.get(`${i.productId}/${i.variantId}`);
        return o && o.stock > 0 ? [{ productId: i.productId, name: o.name, variantLabel: o.variantLabel, image: o.image?.url ?? null }] : [];
      });
      if (!lines.length) continue; // plus rien en stock : pas de relance
      const previous = await adminDb().runTransaction(async (tx) => {
        const sent = ((await tx.get(mark)).get('stage') as number | undefined) ?? 0;
        if (!stageToSend(due, sent)) return null;
        tx.set(mark, { uid, stage: due, at: FieldValue.serverTimestamp() });
        return sent;
      });
      if (previous === null) continue;
      const text = texts[`relance${due}`];
      const personal = text.personal ? await personalParagraph(`relance${due}`, await piecesFacts(lines).catch(() => [])) : null;
      const result = await sendEmail(cartReminder(due, user.email, lines, origin, await optOutUrl(user.email, origin), { text, personal }));
      if (result === 'envoye') s.relances++;
      else { s.echecs++; await mark.set({ uid, stage: previous }, { merge: true }); } // nouvel essai au prochain passage
    } catch {
      s.echecs++;
      console.error('envois automatiques : relance de panier impossible');
    }
  }
}

async function orderFollowUps(origin: string, now: Date, arrivalDays: number, texts: EmailTexts, s: AutomationSummary) {
  const orders = await adminDb().collection(COLLECTIONS.orders).where('status', 'in', ['shipped', 'delivered']).get();
  for (const o of orders.docs) {
    try {
      const reference = o.get('reference');
      const email = o.get('customer.email');
      if (typeof reference !== 'string' || typeof email !== 'string') continue; // commandes de l'ancien site : rien
      const dates = { status: String(o.get('status')), shippedAt: date(o.get('shippedAt')), deliveredAt: date(o.get('deliveredAt')) };
      const sent = (o.get('emails') ?? {}) as Record<string, unknown>;
      const jobs = [
        ['arrivee', sent.arrivee !== 'envoye' && arrivalDue(dates, now, arrivalDays), arrivalCheck] as const,
        ['avis', sent.avis !== 'envoye' && reviewDue(dates, now, arrivalDays), reviewRequest] as const,
      ];
      for (const [field, due, template] of jobs) {
        if (!due) continue;
        if (await isOptedOut(email)) break;
        const text = texts[field];
        const items = (o.get('items') ?? []) as { productId: string; name: string; variantLabel: string }[];
        const personal = text.personal ? await personalParagraph(field, await piecesFacts(items).catch(() => [])) : null;
        const result = await sendEmail(template(email, reference, await optOutUrl(email, origin), { text, personal }));
        if (result === 'envoye') {
          await o.ref.update({ [`emails.${field}`]: 'envoye' });
          s[field === 'arrivee' ? 'arrivees' : 'avis']++;
        } else s.echecs++;
      }
    } catch {
      s.echecs++;
      console.error('envois automatiques : suivi de commande impossible');
    }
  }
}

export async function runAutomations(origin: string, now = new Date()): Promise<AutomationSummary> {
  const summary: AutomationSummary = { relances: 0, arrivees: 0, avis: 0, echecs: 0 };
  const texts = await loadEmailTexts();
  await cartReminders(origin, now, texts, summary);
  await orderFollowUps(origin, now, await readArrivalDays(), texts, summary);
  await adminDb().collection(COLLECTIONS.settings).doc('automations').set({ lastRunAt: FieldValue.serverTimestamp(), ...summary });
  return summary;
}

// Réglages de l'Atelier : délai « colis arrivé ? » et dernier passage des envois.
export async function readAutomationsState() {
  const snap = await adminDb().collection(COLLECTIONS.settings).doc('automations').get();
  const n = (k: string) => (Number.isInteger(snap.get(k)) ? (snap.get(k) as number) : 0);
  return {
    arrivalDays: await readArrivalDays(),
    lastRun: snap.exists
      ? { at: date(snap.get('lastRunAt'))?.toISOString() ?? null, relances: n('relances'), arrivees: n('arrivees'), avis: n('avis'), echecs: n('echecs') }
      : null,
  };
}
