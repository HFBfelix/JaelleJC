// Adresse publique du site, pour les liens envoyés hors du site (retour de Stripe, liens des e-mails) : jamais déduite
// de la requête en ligne. Production : NEXT_PUBLIC_SITE_URL ; aperçu Vercel : l'adresse de la branche
// (VERCEL_BRANCH_URL), celle où la cliente est connectée (l'adresse propre au déploiement, VERCEL_URL, est un autre
// domaine, sans ses cookies) ; poste local : l'hôte local de la requête.
import 'server-only';
import { headers } from 'next/headers';

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const env = (name: string) => process.env[name]?.trim() || null;

export async function siteOrigin() {
  if (env('VERCEL_ENV') === 'production') return env('NEXT_PUBLIC_SITE_URL') ?? 'https://www.jaellejc.com';
  const preview = env('VERCEL_BRANCH_URL') ?? env('VERCEL_URL');
  if (preview) return `https://${preview}`;
  const host = (await headers()).get('host') ?? '';
  if (!LOCAL_HOST.test(host)) throw new Error('Adresse du site inconnue.');
  return `http://${host}`;
}
