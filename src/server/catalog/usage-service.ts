// Recherche par usage (lot 6) : orchestration côté serveur, dans cet ordre (documenté dans
// reports/securite/etape-7bis-recherche.md) :
//   1. limite par visiteur (adresse IP hachée) ;
//   2. mémoire : la même phrase, pour le même catalogue, ressert la réponse des dernières 24 h (aucun appel) ;
//   3. plafonds du site (heure, puis jour), comptés seulement pour les appels réels à Mistral ;
//   4. appel à Mistral (réponse plafonnée en longueur, 8 s au plus), identifiants hors catalogue ignorés ;
//   5. issue comptée dans `usageStats/{jour}` et écrite dans le journal, alerte à la boutique si besoin.
// Jamais gardés ni écrits dans le journal : la phrase de la cliente, son adresse IP. La mémoire ne garde qu'une
// empreinte (SHA-256) de la phrase et du catalogue, et les identifiants des pièces trouvées.
import 'server-only';
import { createHash } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { MAX_TOKENS, aiEnabled, endpoint } from '../createur/ai';
import { COLLECTIONS } from '../db/schema';
import { sendEmail, shopNotificationAddress } from '../emails/sender';
import { searchAlert } from '../emails/templates';
import { adminDb } from '../firebase/admin';
import { siteOrigin } from '../http/origin';
import { clientIp, takeRateLimit } from '../http/rate-limit';
import { listPublishedProducts } from './repository';
import type { ProductCardView } from './types';
import {
  USAGE_LIMITS, USAGE_OUTCOMES, alertFor, dayKey, normalizeQuery, parseUsageIds, usageFacts, usagePrompt,
  type UsageAlert, type UsageOutcome,
} from './usage-search';

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const STATS_KEEP_DAYS = 90;
const TIMEOUT_MS = 8_000;

const sha = (value: string) => createHash('sha256').update(value).digest('hex');

// Empreinte de la phrase et des faits du catalogue envoyés : une fiche modifiée change l'empreinte (réponse refaite).
const memoryKey = (query: string, products: ProductCardView[]) => sha(`${normalizeQuery(query)}\n${sha(usageFacts('', products))}`);

async function fromMemory(key: string, products: ProductCardView[]): Promise<string[] | null> {
  const snap = await adminDb().collection(COLLECTIONS.usageCache).doc(key).get();
  const expires = snap.get('expiresAt');
  const ids = snap.get('ids');
  if (!(expires instanceof Timestamp) || expires.toMillis() <= Date.now() || !Array.isArray(ids)) return null;
  const known = new Set(products.map((p) => p.id));
  return ids.filter((id): id is string => typeof id === 'string' && known.has(id)); // pièce retirée entre-temps : écartée
}

async function askMistral(query: string, products: ProductCardView[]): Promise<string[] | null> {
  const res = await fetch(endpoint('/v1/chat/completions'), {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.MISTRAL_API_KEY!.trim()}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.MISTRAL_MODEL?.trim() || 'mistral-small-latest',
      temperature: 0,
      max_tokens: MAX_TOKENS.recherche,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: usagePrompt() }, { role: 'user', content: usageFacts(query, products) }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return parseUsageIds(body.choices?.[0]?.message?.content ?? '', products);
}

// Compte l'issue du jour ; un compteur indisponible ne prive jamais la cliente de sa réponse (erreur journalisée).
async function record(outcome: UsageOutcome): Promise<void> {
  try {
    await count(outcome);
  } catch {
    console.error(`recherche par usage : compteur non mis à jour (${outcome})`);
  }
}

// En transaction : l'alerte part une seule fois même pour deux recherches simultanées.
async function count(outcome: UsageOutcome): Promise<void> {
  const now = new Date();
  const day = dayKey(now);
  const ref = adminDb().collection(COLLECTIONS.usageStats).doc(day);
  // Journal : l'issue seule (ni phrase ni adresse). Les refus et échecs ressortent en avertissement.
  const line = `recherche par usage : ${outcome}`;
  if (outcome === 'memoire' || outcome === 'ia') console.info(line); else console.warn(line);
  const due = await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const counts = Object.fromEntries(USAGE_OUTCOMES.map((o) => [o, Number(snap.get(o)) || 0])) as Record<UsageOutcome, number>;
    counts[outcome] += 1;
    const sent = (snap.get('alertes') ?? {}) as Partial<Record<UsageAlert, boolean>>;
    const alert = alertFor(outcome, counts.echec, sent);
    tx.set(ref, {
      [outcome]: FieldValue.increment(1),
      ...(alert ? { alertes: { ...sent, [alert]: true } } : {}),
      expiresAt: Timestamp.fromMillis(now.getTime() + STATS_KEEP_DAYS * DAY),
    }, { merge: true });
    return alert ? { alert, counts } : null;
  });
  if (!due) return;
  console.warn(`recherche par usage : alerte « ${due.alert} » envoyée à la boutique`);
  const sentResult = await sendEmail(searchAlert(shopNotificationAddress(), due.alert, day, due.counts, await siteOrigin())).catch(() => 'echec');
  if (sentResult !== 'envoye') console.error(`recherche par usage : alerte « ${due.alert} » non envoyée (${sentResult})`);
}

// Pièces qui conviennent à la phrase (identifiants du catalogue en ligne), ou null : la recherche par mots reste.
export async function searchByUsage(query: string): Promise<string[] | null> {
  if (!aiEnabled()) return null;
  if (!(await takeRateLimit('recherche-ip', await clientIp(), USAGE_LIMITS.parVisiteurHeure, HOUR))) {
    await record('refus-visiteur');
    return null;
  }
  const products = await listPublishedProducts();
  if (!products.length) return [];
  const key = memoryKey(query, products);
  const remembered = await fromMemory(key, products);
  if (remembered) {
    await record('memoire');
    return remembered;
  }
  if (!(await takeRateLimit('recherche-site', 'tout', USAGE_LIMITS.siteHeure, HOUR))) {
    await record('refus-heure');
    return null;
  }
  if (!(await takeRateLimit('recherche-jour', 'tout', USAGE_LIMITS.siteJour, DAY))) {
    await record('refus-jour');
    return null;
  }
  const ids = await askMistral(query, products).catch(() => null);
  if (!ids) {
    await record('echec');
    return null;
  }
  await adminDb().collection(COLLECTIONS.usageCache).doc(key).set({
    ids, expiresAt: Timestamp.fromMillis(Date.now() + USAGE_LIMITS.memoireHeures * HOUR),
  });
  await record('ia');
  return ids;
}

// Compteur de l'Atelier (Réglages) : aujourd'hui et hier.
export type UsageDay = { day: string; counts: Record<UsageOutcome, number>; alertes: UsageAlert[] };
export async function readUsageStats(now = new Date()): Promise<UsageDay[]> {
  const days = [dayKey(now), dayKey(new Date(now.getTime() - DAY))];
  const snaps = await adminDb().getAll(...days.map((d) => adminDb().collection(COLLECTIONS.usageStats).doc(d)));
  return snaps.map((s, i) => ({
    day: days[i]!,
    counts: Object.fromEntries(USAGE_OUTCOMES.map((o) => [o, Number(s.get(o)) || 0])) as Record<UsageOutcome, number>,
    alertes: Object.entries((s.get('alertes') ?? {}) as Record<string, boolean>).filter(([, v]) => v).map(([k]) => k as UsageAlert),
  }));
}
