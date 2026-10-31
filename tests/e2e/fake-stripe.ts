// Faux serveur Stripe des parcours (local et CI) : reçoit la création des sessions de paiement et les
// remboursements, comme l'API Stripe, sans rien envoyer chez Stripe. Le site y est branché par
// STRIPE_API_HOST (accepté seulement avec les émulateurs, src/server/payments/stripe.ts).
// Il joue aussi l'API de l'IA du brouillon de fiche (MISTRAL_API_HOST, src/server/createur/ai.ts ; même format que l’API Mistral) : il renvoie
// des propositions fixes et garde les faits reçus, pour vérifier que seuls les faits saisis partent.
import { randomBytes } from 'node:crypto';
import { createServer, type Server } from 'node:http';

export const FAKE_STRIPE_PORT = Number(process.env.STRIPE_FAKE_PORT ?? 12111);
const id = (prefix: string) => `${prefix}_${randomBytes(12).toString('hex')}`;

const sessions = new Map<string, Record<string, string>>();
const refunds: Record<string, string>[] = [];
// Clients Stripe (adresse préremplie) : `deleted` passe à vrai à la suppression du compte.
const customers = new Map<string, { params: Record<string, string>; deleted: boolean }>();
const CUSTOMER_PATH = /^\/v1\/customers\/(cus_[A-Za-z0-9]+)$/;
const aiRequests: unknown[] = [];

function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => resolve(body));
  });
}

function amountTotal(p: Record<string, string>) {
  let total = 0;
  for (let i = 0; p[`line_items[${i}][quantity]`]; i++) {
    total += Number(p[`line_items[${i}][price_data][unit_amount]`]) * Number(p[`line_items[${i}][quantity]`]);
  }
  return total + Number(p['shipping_options[0][shipping_rate_data][fixed_amount][amount]'] ?? 0);
}

export function startFakeStripe(): Promise<Server> {
  const server = createServer(async (req, res) => {
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json', 'request-id': id('req') });
      res.end(JSON.stringify(body));
    };
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method === 'POST' && url.pathname === '/v1/checkout/sessions') {
      const params = Object.fromEntries(new URLSearchParams(await readBody(req)));
      const sessionId = id('cs_test');
      sessions.set(sessionId, params);
      return json(200, {
        id: sessionId, object: 'checkout.session', url: `http://127.0.0.1:${FAKE_STRIPE_PORT}/pay/${sessionId}`,
        amount_total: amountTotal(params), currency: 'eur', client_reference_id: params.client_reference_id ?? null,
        payment_status: 'unpaid', status: 'open',
      });
    }
    if (req.method === 'POST' && url.pathname === '/v1/refunds') {
      const params = Object.fromEntries(new URLSearchParams(await readBody(req)));
      refunds.push({ ...params, idempotencyKey: String(req.headers['idempotency-key'] ?? '') });
      return json(200, { id: id('re'), object: 'refund', status: 'succeeded', payment_intent: params.payment_intent });
    }
    if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
      aiRequests.push(JSON.parse(await readBody(req)));
      const content = JSON.stringify({
        accroches: ['Une cape douce pour le premier bain.', 'Le premier bain, enveloppé de gaze.'],
        histoires: ['Cousue dans notre atelier.', 'Pensée pour les premiers jours.'],
        descriptions: ['Cape en gaze de coton.', 'Une cape simple et douce.'],
      });
      return json(200, { id: id('chatcmpl'), object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content } }] });
    }
    if (req.method === 'GET' && url.pathname === '/__test/ai') return json(200, aiRequests);
    if (req.method === 'POST' && url.pathname === '/v1/customers') {
      const params = Object.fromEntries(new URLSearchParams(await readBody(req)));
      const customerId = id('cus');
      customers.set(customerId, { params, deleted: false });
      return json(200, { id: customerId, object: 'customer', email: params.email ?? null });
    }
    const customerPath = CUSTOMER_PATH.exec(url.pathname);
    if (customerPath && (req.method === 'POST' || req.method === 'DELETE')) {
      const customer = customers.get(customerPath[1]!);
      if (!customer || customer.deleted) {
        return json(404, { error: { type: 'invalid_request_error', code: 'resource_missing', message: 'No such customer' } });
      }
      if (req.method === 'DELETE') {
        customer.deleted = true;
        return json(200, { id: customerPath[1], object: 'customer', deleted: true });
      }
      customer.params = { ...customer.params, ...Object.fromEntries(new URLSearchParams(await readBody(req))) };
      return json(200, { id: customerPath[1], object: 'customer', email: customer.params.email ?? null });
    }
    if (req.method === 'GET' && url.pathname.startsWith('/__test/customers/')) {
      const customer = customers.get(url.pathname.split('/').pop()!);
      return customer ? json(200, customer) : json(404, {});
    }
    if (req.method === 'GET' && url.pathname.startsWith('/pay/')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end('<!doctype html><title>Faux Stripe</title><h1>Paiement (faux Stripe des tests)</h1>');
    }
    if (req.method === 'GET' && url.pathname.startsWith('/__test/sessions/')) {
      const params = sessions.get(url.pathname.split('/').pop()!);
      return params ? json(200, params) : json(404, {});
    }
    if (req.method === 'GET' && url.pathname === '/__test/refunds') return json(200, refunds);
    if (req.method === 'GET' && url.pathname === '/__test/count') return json(200, { sessions: sessions.size });
    return json(404, { error: { message: 'faux Stripe : route inconnue' } });
  });
  return new Promise((resolve) => server.listen(FAKE_STRIPE_PORT, '127.0.0.1', () => resolve(server)));
}
