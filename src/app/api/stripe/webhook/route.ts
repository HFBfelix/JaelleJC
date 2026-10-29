// Webhook Stripe : seule porte de création des commandes. Corps brut + signature vérifiée (secret du webhook),
// sinon 400. Erreur pendant le traitement : 500, Stripe réessaie (le traitement est idempotent).
import type Stripe from 'stripe';
import { NextResponse, type NextRequest } from 'next/server';
import { expireCheckout, fulfilCheckout } from '@/server/orders/fulfil';
import { acceptsLivemode, getStripe, webhookSecret } from '@/server/payments/stripe';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 512 * 1024;

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (!signature || declared > MAX_BODY_BYTES) return NextResponse.json({ error: 'signature' }, { status: 400 });
  const body = await request.text(); // corps brut, exigé par la vérification de signature
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) return NextResponse.json({ error: 'taille' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret());
  } catch {
    return NextResponse.json({ error: 'signature' }, { status: 400 });
  }
  // Événement de production reçu hors production (ou l'inverse) : ignoré.
  if (!acceptsLivemode(event.livemode)) return NextResponse.json({ received: true, ignored: 'livemode' });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await fulfilCheckout(event.data.object, event.id, event.type);
        break;
      case 'checkout.session.expired':
        await expireCheckout(event.data.object.id);
        break;
      default:
        break; // autres événements : rien à faire
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    // Type d'événement et nom de l'erreur seulement : aucune donnée cliente.
    console.error(`webhook : traitement impossible (${event.type}, ${error instanceof Error ? error.name : 'inconnue'})`);
    return NextResponse.json({ error: 'traitement' }, { status: 500 });
  }
}
