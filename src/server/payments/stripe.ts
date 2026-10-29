// Client Stripe (serveur uniquement). Clé secrète lue dans l'environnement serveur, jamais transmise au navigateur.
// Garde-fous : clé « live » refusée hors production ; serveur Stripe de remplacement (tests de parcours)
// accepté seulement sur l'ordinateur de développement, avec les émulateurs.
import 'server-only';
import Stripe from 'stripe';

let client: Stripe | null = null;
const env = (name: string) => process.env[name]?.trim() || null;

export function getStripe(): Stripe {
  if (client) return client;
  const key = env('STRIPE_SECRET_KEY');
  if (!key) throw new Error('Paiement indisponible : STRIPE_SECRET_KEY non configurée.');
  // Hors production : clés de test seulement (secrètes ou restreintes).
  if (env('VERCEL_ENV') !== 'production' && !/^(sk|rk)_test_/.test(key)) {
    throw new Error('Clé Stripe de production refusée hors production.');
  }
  const fakeHost = env('STRIPE_API_HOST');
  if (fakeHost && (env('VERCEL_ENV') || !env('FIRESTORE_EMULATOR_HOST') || !key.startsWith('sk_test_'))) {
    throw new Error('STRIPE_API_HOST réservé aux tests locaux.');
  }
  const [host, port] = fakeHost?.split(':') ?? [];
  client = new Stripe(key, {
    maxNetworkRetries: 2,
    ...(fakeHost ? { host, port: Number(port), protocol: 'http' as const } : {}),
  });
  return client;
}

// Un événement « live » n'est accepté qu'en production (et inversement, la production n'accepte que du live).
export const acceptsLivemode = (livemode: boolean | undefined) => (livemode === true) === (env('VERCEL_ENV') === 'production');

export function webhookSecret(): string {
  const secret = env('STRIPE_WEBHOOK_SECRET');
  if (!secret) throw new Error('Webhook indisponible : STRIPE_WEBHOOK_SECRET non configuré.');
  return secret;
}
