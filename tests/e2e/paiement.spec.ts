// Étape 5 : paiement Stripe (faux serveur local), webhook signé et idempotent, commande, stock, remboursement.
// Un seul navigateur : ces parcours décomptent le stock du jeu de données partagé.
import { randomBytes } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import Stripe from 'stripe';
import { createUser } from './auth-helpers';
import { DELIVERY, FIXTURE, db } from './catalogue-fixture';
import { FAKE_STRIPE_PORT } from './fake-stripe';

const FAKE = `http://127.0.0.1:${FAKE_STRIPE_PORT}`;
const main = (page: Page) => page.getByRole('main');
const stripe = new Stripe(`sk_test_${'0'.repeat(24)}`);
const rand = (prefix: string) => `${prefix}_${randomBytes(10).toString('hex')}`;

// Les uns après les autres : ils lisent et décomptent le même stock.
test.describe.configure({ mode: 'default' });

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'ordinateur', 'décompte le stock du jeu de données partagé');
  test.skip(!process.env.STRIPE_WEBHOOK_SECRET, 'STRIPE_WEBHOOK_SECRET requis (faux Stripe local)');
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
});

const stockOf = async (productId: string) => (await db().doc(`produits/${productId}/variantes/unique`).get()).get('stock') as number;
const setStock = (productId: string, stock: number) => db().doc(`produits/${productId}/variantes/unique`).update({ stock });

async function signIn(page: Page) {
  const user = await createUser();
  await page.goto('/connexion');
  await main(page).getByLabel('Votre e-mail').fill(user.email);
  await main(page).getByRole('button', { name: 'Utiliser un mot de passe' }).click();
  await main(page).getByLabel('Mot de passe').fill(user.password);
  await main(page).getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/compte$/);
  return user;
}

async function addToCart(page: Page, slug: string) {
  await page.goto(`/produits/${slug}`);
  await page.getByRole('button', { name: 'Ajouter à la sélection' }).click();
  await expect(page.getByRole('dialog', { name: 'Votre sélection' }).getByRole('status')).toHaveText('Ajouté à votre sélection');
}

// Étape « Livraison » de la page panier (avant Stripe) : adresse et téléphone obligatoires.
async function fillShipping(page: Page) {
  const form = main(page).getByRole('group', { name: 'Livraison' });
  await form.getByLabel('Nom et prénom').fill('Camille Test');
  await form.getByLabel('Adresse', { exact: true }).fill('1 rue de la Paix');
  await form.getByLabel('Code postal').fill('75002');
  await form.getByLabel('Ville').fill('Paris');
  await form.getByLabel('Téléphone').fill('06 00 00 00 00');
}

// Clic « Confirmer et payer » depuis la page panier : renvoie l'identifiant de la session créée chez (le faux) Stripe.
async function pay(page: Page, gift?: string) {
  await page.goto('/panier');
  await fillShipping(page);
  if (gift !== undefined) {
    await main(page).getByLabel('Emballage cadeau').check();
    await main(page).getByLabel('Un mot pour la naissance (optionnel)').fill(gift);
  }
  await main(page).getByRole('button', { name: 'Confirmer et payer' }).click();
  await page.waitForURL(/\/pay\/cs_test_/);
  return page.url().split('/pay/')[1]!;
}

const sessionParams = async (id: string) => (await (await fetch(`${FAKE}/__test/sessions/${id}`)).json()) as Record<string, string>;

function event(sessionId: string, params: Record<string, string>, over: Record<string, unknown> = {}) {
  let amount = 0;
  for (let i = 0; params[`line_items[${i}][quantity]`]; i++) {
    amount += Number(params[`line_items[${i}][price_data][unit_amount]`]) * Number(params[`line_items[${i}][quantity]`]);
  }
  amount += Number(params['shipping_options[0][shipping_rate_data][fixed_amount][amount]'] ?? 0);
  return {
    id: rand('evt'), object: 'event', type: 'checkout.session.completed', api_version: '2026-02-25.clover', created: Math.floor(Date.now() / 1000),
    data: { object: {
      id: sessionId, object: 'checkout.session', payment_status: 'paid', amount_total: amount, currency: 'eur',
      client_reference_id: params.client_reference_id, payment_intent: rand('pi'),
      customer_details: { email: params.customer_email ?? null, name: 'Camille Test', phone: '+33600000000' },
      collected_information: { shipping_details: { name: 'Camille Test', address: { line1: '1 rue de la Paix', line2: null, postal_code: '75002', city: 'Paris', country: 'FR' } } },
      ...over,
    } },
  };
}

async function sendWebhook(page: Page, payload: object, secret = process.env.STRIPE_WEBHOOK_SECRET!) {
  const body = JSON.stringify(payload);
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });
  return page.request.post('/api/stripe/webhook', { data: body, headers: { 'stripe-signature': signature, 'content-type': 'application/json' } });
}

const orderOf = async (sessionId: string) => (await db().doc(`orders/${sessionId}`).get()).data();

test('paiement réussi : prix lus en base, commande créée par le webhook, stock décompté, panier vidé, confirmation', async ({ page }) => {
  const user = await signIn(page);
  const before = await stockOf(FIXTURE.buy.id);
  await addToCart(page, FIXTURE.buy.slug);
  const sessionId = await pay(page, '<b>Bienvenue</b> petite Lou');

  const params = await sessionParams(sessionId);
  expect(params).toMatchObject({
    mode: 'payment', customer: expect.stringMatching(/^cus_/), client_reference_id: user.uid, 'metadata[cartId]': `u_${user.uid}`,
    'line_items[0][price_data][unit_amount]': String(FIXTURE.buy.priceCents), 'line_items[0][price_data][currency]': 'eur',
    'line_items[0][quantity]': '1', 'line_items[0][price_data][product_data][metadata][productId]': FIXTURE.buy.id,
    'shipping_address_collection[allowed_countries][0]': 'FR', 'phone_number_collection[enabled]': 'true',
  });
  expect(params['line_items[1][quantity]']).toBeUndefined();
  expect(await orderOf(sessionId)).toBeUndefined(); // aucune commande avant le paiement confirmé

  const res = await sendWebhook(page, event(sessionId, params));
  expect(res.status()).toBe(200);
  const order = await orderOf(sessionId);
  expect(order).toMatchObject({
    userId: user.uid, status: 'paid', refund: null,
    items: [{ productId: FIXTURE.buy.id, quantity: 1, unitPriceCents: FIXTURE.buy.priceCents }],
    gift: { wrap: true, message: '<b>Bienvenue</b> petite Lou' }, // texte brut ; échappé à l'affichage et dans les e-mails
    shipping: { line1: '1 rue de la Paix', zipCode: '75002', city: 'Paris', country: 'FR' },
    emails: { cliente: 'en_attente', boutique: 'en_attente' }, // expéditeur pas encore choisi
  });
  expect(order!.reference).toMatch(/^JJC-\d{6}-[A-Z2-9]{4}$/);
  expect(await stockOf(FIXTURE.buy.id)).toBe(before - 1);
  expect((await db().doc(`carts/u_${user.uid}`).get()).get('items')).toEqual([]);

  await page.goto(`/commande/confirmation?session_id=${sessionId}`);
  await expect(main(page).getByRole('heading', { level: 1 })).toHaveText('Merci. Votre pièce est en préparation.');
  await expect(main(page).getByText(`Référence : ${order!.reference}`)).toBeVisible();
  await expect(main(page).getByText('Emballage cadeau — « <b>Bienvenue</b> petite Lou »')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Ma sélection/ })).toHaveAccessibleName('Ma sélection (0)');
});

test('webhook rejoué ou envoyé deux fois : une seule commande, stock décompté une fois', async ({ page }) => {
  await signIn(page);
  await addToCart(page, FIXTURE.buy.slug);
  const sessionId = await pay(page);
  const params = await sessionParams(sessionId);
  const before = await stockOf(FIXTURE.buy.id);
  const evt = event(sessionId, params);
  expect((await sendWebhook(page, evt)).status()).toBe(200);
  expect((await sendWebhook(page, evt)).status()).toBe(200);
  expect((await sendWebhook(page, { ...evt, id: rand('evt') })).status()).toBe(200); // autre événement, même session
  expect(await stockOf(FIXTURE.buy.id)).toBe(before - 1);
  expect((await db().collection('orders').where('stripe.sessionId', '==', sessionId).get()).size).toBe(1);
});

test('signature absente, fausse ou corps modifié : refusé (400), rien n’est créé', async ({ page }) => {
  await signIn(page);
  await addToCart(page, FIXTURE.buy.slug);
  const sessionId = await pay(page);
  const evt = event(sessionId, await sessionParams(sessionId));
  const body = JSON.stringify(evt);
  expect((await page.request.post('/api/stripe/webhook', { data: body })).status()).toBe(400);
  expect((await sendWebhook(page, evt, `whsec_${randomBytes(24).toString('hex')}`)).status()).toBe(400);
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret: process.env.STRIPE_WEBHOOK_SECRET! });
  const tampered = body.replace(/"amount_total":\d+/, '"amount_total":1');
  expect((await page.request.post('/api/stripe/webhook', { data: tampered, headers: { 'stripe-signature': signature } })).status()).toBe(400);
  expect(await orderOf(sessionId)).toBeUndefined();
});

test('paiement non abouti : aucune commande ; la page de confirmation attend', async ({ page }) => {
  await signIn(page);
  await addToCart(page, FIXTURE.buy.slug);
  const sessionId = await pay(page);
  expect((await sendWebhook(page, event(sessionId, await sessionParams(sessionId), { payment_status: 'unpaid' }))).status()).toBe(200);
  expect(await orderOf(sessionId)).toBeUndefined();
  await page.goto(`/commande/confirmation?session_id=${sessionId}`);
  await expect(main(page).getByRole('status')).toHaveText('Nous confirmons votre commande… Cette page se met à jour toute seule.');
});

test('carte seulement : aucun moyen de paiement différé proposé', async ({ page }) => {
  await signIn(page);
  await addToCart(page, FIXTURE.buy.slug);
  const params = await sessionParams(await pay(page));
  expect(params['payment_method_types[0]']).toBe('card');
  expect(params['payment_method_types[1]']).toBeUndefined();
});

test('paiement sans instantané du panier : aucune commande inventée, paiement remboursé', async ({ page }) => {
  await signIn(page);
  await addToCart(page, FIXTURE.buy.slug);
  const sessionId = await pay(page);
  const evt = event(sessionId, await sessionParams(sessionId));
  await db().doc(`checkouts/${sessionId}`).delete(); // comme après la suppression automatique
  expect((await sendWebhook(page, evt)).status()).toBe(200);
  expect(await orderOf(sessionId)).toBeUndefined();
  const record = (await db().doc(`stripeEvents/${evt.id}`).get()).data();
  expect(record).toMatchObject({ anomaly: 'instantane-absent', refundId: expect.stringMatching(/^re_/) });
});

test('événement de production reçu hors production : ignoré', async ({ page }) => {
  await signIn(page);
  await addToCart(page, FIXTURE.buy.slug);
  const sessionId = await pay(page);
  const evt = { ...event(sessionId, await sessionParams(sessionId)), livemode: true };
  expect((await sendWebhook(page, evt)).status()).toBe(200);
  expect(await orderOf(sessionId)).toBeUndefined();
});

test('session expirée : plus de page d’attente', async ({ page }) => {
  await signIn(page);
  await addToCart(page, FIXTURE.buy.slug);
  const sessionId = await pay(page);
  const expired = { ...event(sessionId, await sessionParams(sessionId)), type: 'checkout.session.expired' };
  expect((await sendWebhook(page, expired)).status()).toBe(200);
  expect((await page.goto(`/commande/confirmation?session_id=${sessionId}`))?.status()).toBe(404);
});

test('montant payé différent du panier : commande remboursée automatiquement', async ({ page }) => {
  await signIn(page);
  await addToCart(page, FIXTURE.buy.slug);
  const sessionId = await pay(page);
  const before = await stockOf(FIXTURE.buy.id);
  const evt = event(sessionId, await sessionParams(sessionId), { amount_total: 100 });
  expect((await sendWebhook(page, evt)).status()).toBe(200);
  expect(await orderOf(sessionId)).toMatchObject({ status: 'refunded', refund: { reason: 'montant', id: expect.stringMatching(/^re_/) } });
  expect(await stockOf(FIXTURE.buy.id)).toBe(before);
  await page.goto(`/commande/confirmation?session_id=${sessionId}`);
  await expect(main(page).getByRole('heading', { level: 1 })).toHaveText('Votre commande n’a pas pu aboutir.');
});

test('dernière pièce payée par deux clientes : la seconde est remboursée et prévenue', async ({ page, browser }) => {
  await setStock(FIXTURE.last.id, 1);
  await signIn(page);
  await addToCart(page, FIXTURE.last.slug);
  const first = await pay(page);

  const other = await browser.newContext();
  const second = await other.newPage();
  await second.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
  await signIn(second);
  await addToCart(second, FIXTURE.last.slug);
  const late = await pay(second);

  expect((await sendWebhook(page, event(first, await sessionParams(first)))).status()).toBe(200);
  const lateEvent = event(late, await sessionParams(late));
  expect((await sendWebhook(second, lateEvent)).status()).toBe(200);
  expect(await stockOf(FIXTURE.last.id)).toBe(0);
  expect(await orderOf(first)).toMatchObject({ status: 'paid' });
  expect(await orderOf(late)).toMatchObject({ status: 'refunded', refund: { reason: 'stock', id: expect.stringMatching(/^re_/) } });

  const refunds = (await (await fetch(`${FAKE}/__test/refunds`)).json()) as Record<string, string>[];
  const payment = (lateEvent.data.object as { payment_intent: string }).payment_intent;
  expect(refunds.filter((r) => r.payment_intent === payment)).toEqual([expect.objectContaining({ idempotencyKey: `refund-${late}` })]);

  await second.goto(`/commande/confirmation?session_id=${late}`);
  await expect(main(second).getByRole('heading', { level: 1 })).toHaveText('Votre pièce a trouvé preneur.');
  await other.close();
});

test('stock vérifié au clic « Payer » : pièce partie entre-temps, pas de paiement', async ({ page }) => {
  await setStock(FIXTURE.last.id, 1);
  await signIn(page);
  await addToCart(page, FIXTURE.last.slug);
  await page.goto('/panier');
  // Pièce vendue pendant que la page est ouverte (au rechargement, le panier serait déjà corrigé).
  await setStock(FIXTURE.last.id, 0);
  await fillShipping(page);
  const sessionsBefore = ((await (await fetch(`${FAKE}/__test/count`)).json()) as { sessions: number }).sessions;
  await main(page).getByRole('button', { name: 'Confirmer et payer' }).click();
  await expect(main(page).getByRole('status')).toHaveText('Cette pièce vient de trouver preneur. Elle a été retirée de votre sélection.');
  expect(((await (await fetch(`${FAKE}/__test/count`)).json()) as { sessions: number }).sessions).toBe(sessionsBefore);
  await expect(main(page).getByText('Votre sélection est vide.')).toBeVisible();
});

test('prix modifié en base après l’ajout : Stripe reçoit le prix de la base', async ({ page }) => {
  await signIn(page);
  await addToCart(page, FIXTURE.buy.slug);
  const product = db().doc(`produits/${FIXTURE.buy.id}`);
  try {
    await product.update({ priceCents: 6500 });
    const sessionId = await pay(page);
    expect((await sessionParams(sessionId))['line_items[0][price_data][unit_amount]']).toBe('6500');
  } finally {
    await product.update({ priceCents: FIXTURE.buy.priceCents });
  }
});

test('livraison : forfait du réglage ajouté sous le seuil, offerte au-dessus', async ({ page }) => {
  const settings = (await db().doc('settings/delivery').get()).data() as typeof DELIVERY;
  await signIn(page);
  await addToCart(page, FIXTURE.buy.slug);
  const sessionId = await pay(page);
  const expected = settings.flatRateCents === 0 || FIXTURE.buy.priceCents >= settings.freeThresholdCents && settings.freeThresholdCents > 0
    ? 0 : settings.flatRateCents;
  expect((await sessionParams(sessionId))['shipping_options[0][shipping_rate_data][fixed_amount][amount]']).toBe(String(expected));
});

test('confirmation : réservée à la propriétaire de la commande', async ({ page, browser }) => {
  await signIn(page);
  await addToCart(page, FIXTURE.buy.slug);
  const sessionId = await pay(page);
  expect((await sendWebhook(page, event(sessionId, await sessionParams(sessionId)))).status()).toBe(200);

  const other = await browser.newContext();
  const stranger = await other.newPage();
  await stranger.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
  await stranger.goto(`/commande/confirmation?session_id=${sessionId}`);
  await expect(stranger).toHaveURL(/\/connexion/); // anonyme
  await signIn(stranger);
  const res = await stranger.goto(`/commande/confirmation?session_id=${sessionId}`);
  expect(res?.status()).toBe(404); // autre cliente
  expect(await stranger.content()).not.toContain('Référence');
  await other.close();
});
