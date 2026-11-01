// Limite d'appels pour les formulaires publics (lien de connexion, recherche…) : compteur par fenêtre de temps,
// tenu en transaction dans `rateLimits` (serveur uniquement, règles : tout refusé ; TTL `expiresAt`).
// La clé est hachée : ni adresse e-mail ni adresse IP en clair en base.
import 'server-only';
import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { headers } from 'next/headers';
import { COLLECTIONS } from '../db/schema';
import { adminDb } from '../firebase/admin';

const hash = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 40);

// Vrai si l'appel est permis (et compté), faux si la limite de la fenêtre est atteinte.
export async function takeRateLimit(scope: string, key: string, limit: number, windowMs: number, now = Date.now()): Promise<boolean> {
  const window = Math.floor(now / windowMs);
  const ref = adminDb().collection(COLLECTIONS.rateLimits).doc(`${scope}_${hash(key)}_${window}`);
  return adminDb().runTransaction(async (tx) => {
    const count = ((await tx.get(ref)).get('count') as number | undefined) ?? 0;
    if (count >= limit) return false;
    tx.set(ref, { count: count + 1, expiresAt: Timestamp.fromMillis((window + 2) * windowMs) });
    return true;
  });
}

// Adresse IP de la requête (Vercel : première de x-forwarded-for), seulement pour la limite, jamais gardée en clair.
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'inconnue';
}
