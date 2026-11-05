// Faux serveur Stripe des parcours (local et CI) : reçoit la création des sessions de paiement et les
// remboursements, comme l'API Stripe, sans rien envoyer chez Stripe. Le site y est branché par
// STRIPE_API_HOST (accepté seulement avec les émulateurs, src/server/payments/stripe.ts).
// Il joue aussi l'API Mistral de l'espace créatrice (MISTRAL_API_HOST, src/server/createur/ai.ts) : analyse d'une pièce
// (réponse fixe, requêtes gardées pour vérifier ce qui part) et transcription de la dictée (texte fixe),
// ainsi que la Base Adresse Nationale (ADDRESS_API_URL, src/server/checkout/address.ts) et l'API e-mail de Brevo
// (BREVO_API_URL, src/server/emails/sender.ts) : e-mails gardés pour vérifier qui les reçoit et ce qu'ils disent.
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';

export const FAKE_STRIPE_PORT = Number(process.env.STRIPE_FAKE_PORT ?? 12111);
const id = (prefix: string) => `${prefix}_${randomBytes(12).toString('hex')}`;

const sessions = new Map<string, Record<string, string>>();
const refunds: Record<string, string>[] = [];
// Clients Stripe (adresse préremplie) : `deleted` passe à vrai à la suppression du compte.
const customers = new Map<string, { params: Record<string, string>; deleted: boolean }>();
const CUSTOMER_PATH = /^\/v1\/customers\/(cus_[A-Za-z0-9]+)$/;
const aiRequests: unknown[] = [];
export type FakeEmail = { to: string; subject: string; html: string; text: string };
const emails: FakeEmail[] = [];
// Contacts de la liste Brevo de la newsletter (ajout, retrait).
const contacts = new Map<string, { email: string; listIds: number[] }>();
const STREETS = [
  { postcode: '75002', match: /rue de la p/i, name: 'Rue de la Paix', city: 'Paris' },
  { postcode: '78000', match: /place du m/i, name: 'Place du Marché', city: 'Versailles' },
  { postcode: '69001', match: /rue neuve/i, name: 'Rue Neuve', city: 'Lyon' },
  { postcode: '20000', match: /cours napol/i, name: 'Cours Napoléon', city: 'Ajaccio' }, // Corse : métropole
];

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
      const request = JSON.parse(await readBody(req)) as { messages: { role: string; content: unknown }[] };
      aiRequests.push(request);
      // Textes du catalogue (Atelier) : un texte fixe par pièce reçue.
      if (String(request.messages[0]?.content).includes('catalogue imprimé')) {
        const facts = JSON.parse(String(request.messages[1]?.content).replace(/^FAITS : /, '')) as { id: string; nom: string }[];
        const catalogue = JSON.stringify({
          introduction: 'Des pièces cousues à l’atelier, choisies pour cette saison.',
          pieces: facts.map((f) => ({ id: f.id, texte: `Texte de l’IA pour ${f.nom}.` })),
        });
        return json(200, { id: id('chatcmpl'), object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: catalogue } }] });
      }
      // Recherche par usage : baptême → coffrets, vacances → cabas, sinon rien (pièces du catalogue reçu seulement).
      if (String(request.messages[0]?.content).includes('trouver une pièce')) {
        const { recherche, catalogue } = JSON.parse(String(request.messages[1]?.content)) as { recherche: string; catalogue: { id: string; nom: string }[] };
        // IA détournée (« écris un poème ») : texte libre au lieu de la liste attendue, avec du HTML.
        if (/po[eè]me/i.test(recherche)) {
          return json(200, { id: id('chatcmpl'), object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: 'Voici un poème <b>inventé</b> et une pièce « Robe magique ».' } }] });
        }
        const word = /bapt[eê]me/i.test(recherche) ? 'Coffret' : /vacances/i.test(recherche) ? 'Cabas' : null;
        const ids = word ? catalogue.filter((p) => p.nom.includes(word)).map((p) => p.id) : [];
        return json(200, { id: id('chatcmpl'), object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify({ ids }) } }] });
      }
      // Paragraphe personnalisé des e-mails : une phrase fixe citant la première pièce reçue.
      if (String(request.messages[0]?.content).includes('ajouté à un e-mail')) {
        const facts = JSON.parse(String(request.messages[1]?.content).replace(/^FAITS : /, '')) as { nom: string }[];
        const paragraphe = JSON.stringify({ paragraphe: `Paragraphe de l’IA sur ${facts[0]?.nom ?? 'la pièce'}.` });
        return json(200, { id: id('chatcmpl'), object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: paragraphe } }] });
      }
      const content = JSON.stringify({
        nom: 'E2E créatrice cape de bain en gaze', univers: 'createur-e2e', famille: 'capes', prixEuros: 45.5,
        matieres: ['gaze de coton'], details: ['Cape : 80 × 80 cm'], entretien: 'Lavage à 30 °C.', serieLimitee: null,
        emballageCadeau: true, usages: ['naissance', 'baptême'], motsCles: ['cape'], accroche: 'Une cape douce pour le premier bain.',
        histoire: 'Cousue dans notre atelier.', description: 'Cape en gaze de coton, pensée pour les premiers jours.', faq: [],
        variantes: [{ coloris: 'écru', taille: '', stock: 3, prixEuros: null }, { coloris: 'rose', taille: '', stock: null, prixEuros: null }],
        textesAlternatifs: ['Cape de bain écrue pliée'], manquants: ['Stock du coloris rose non indiqué'],
      });
      return json(200, { id: id('chatcmpl'), object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content } }] });
    }
    if (req.method === 'POST' && url.pathname === '/v1/audio/transcriptions') {
      await readBody(req);
      return json(200, { model: 'voxtral-mini-latest', text: 'Cape de bain en gaze de coton, trois pièces en écru.' });
    }
    if (req.method === 'GET' && url.pathname === '/__test/ai') return json(200, aiRequests);
    // Photos de pièces pour le catalogue PDF (images du dossier public/assets, servies telles quelles).
    const photoName = /^\/__test\/photo\/([A-Za-z0-9_-]+\.(?:webp|png|jpg))$/.exec(url.pathname)?.[1];
    if (req.method === 'GET' && photoName) {
      const body = await readFile(`public/assets/${photoName}`).catch(() => null);
      if (!body) return json(404, {});
      res.writeHead(200, { 'content-type': 'application/octet-stream' });
      return res.end(body);
    }
    if (req.method === 'POST' && url.pathname === '/v3/smtp/email') {
      if (!req.headers['api-key']) return json(401, { code: 'unauthorized' });
      const body = JSON.parse(await readBody(req)) as { to: { email: string }[]; subject: string; htmlContent: string; textContent: string };
      for (const t of body.to) emails.push({ to: t.email, subject: body.subject, html: body.htmlContent, text: body.textContent });
      return json(201, { messageId: `<${id('msg')}@smtp-relay.mailin.fr>` });
    }
    if (req.method === 'POST' && url.pathname === '/v3/contacts') {
      const body = JSON.parse(await readBody(req)) as { email: string; listIds: number[] };
      contacts.set(body.email, { email: body.email, listIds: body.listIds });
      return json(201, { id: contacts.size });
    }
    if (req.method === 'POST' && /^\/v3\/contacts\/lists\/\d+\/contacts\/remove$/.test(url.pathname)) {
      const body = JSON.parse(await readBody(req)) as { emails: string[] };
      for (const e of body.emails) contacts.delete(e);
      return json(201, { contacts: { success: body.emails } });
    }
    if (req.method === 'GET' && url.pathname === '/__test/contacts') return json(200, [...contacts.values()]);
    // E-mails reçus par une adresse (les plus récents en dernier).
    if (req.method === 'GET' && url.pathname === '/__test/emails') {
      const to = url.searchParams.get('to');
      return json(200, to ? emails.filter((e) => e.to === to) : emails);
    }
    // Base Adresse Nationale (ADDRESS_API_URL) : seules les rues de STREETS existent ; appelée aussi par le navigateur.
    if (req.method === 'GET' && url.pathname === '/geocodage/search') {
      res.setHeader('access-control-allow-origin', '*');
      const q = url.searchParams.get('q') ?? '';
      const number = /^\s*(\d+)/.exec(q)?.[1];
      const street = STREETS.find((s) => s.postcode === url.searchParams.get('postcode') && s.match.test(q));
      return json(200, { type: 'FeatureCollection', features: number && street ? [{ type: 'Feature', properties: {
        type: 'housenumber', name: `${number} ${street.name}`, housenumber: number, postcode: street.postcode, city: street.city, score: 0.95,
      } }] : [] });
    }
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
    // ?uid= : sessions d'un seul compte (les parcours tournent en parallèle et créent des sessions en même temps).
    if (req.method === 'GET' && url.pathname === '/__test/count') {
      const uid = url.searchParams.get('uid');
      return json(200, { sessions: uid ? [...sessions.values()].filter((s) => s.client_reference_id === uid).length : sessions.size });
    }
    return json(404, { error: { message: 'faux Stripe : route inconnue' } });
  });
  return new Promise((resolve) => server.listen(FAKE_STRIPE_PORT, '127.0.0.1', () => resolve(server)));
}
