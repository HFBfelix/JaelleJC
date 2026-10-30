// Étape 7b : commandes (préparation, expédition Colissimo avec suivi visible par la cliente, livraison) et stocks.
import { randomBytes } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { Timestamp } from 'firebase-admin/firestore';
import { createUser } from './auth-helpers';
import { FIXTURE, db } from './catalogue-fixture';

const main = (page: Page) => page.getByRole('main');

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'ordinateur', 'espace créatrice : ordinateur');
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
});

async function signIn(page: Page, admin: boolean) {
  const user = await createUser({ admin });
  await page.goto(admin ? '/createur/connexion' : '/connexion');
  await main(page).getByLabel('Votre e-mail').fill(user.email);
  await main(page).getByRole('button', { name: 'Utiliser un mot de passe' }).click();
  await main(page).getByLabel('Mot de passe').fill(user.password);
  await main(page).getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(admin ? /\/createur$/ : /\/compte$/);
  return user;
}

async function seedOrder(userId: string) {
  const id = `cs_test_${randomBytes(10).toString('hex')}`;
  const reference = `JJC-261030-${randomBytes(2).toString('hex').toUpperCase()}`;
  await db().doc(`orders/${id}`).set({
    userId, reference, status: 'paid', createdAt: Timestamp.now(),
    items: [{ productId: FIXTURE.buy.id, variantId: 'unique', sku: 'S', name: FIXTURE.buy.name, variantLabel: '', unitPriceCents: 6000, quantity: 1, image: '' }],
    amounts: { subtotalCents: 6000, deliveryCents: 690, totalCents: 6690 },
    customer: { uid: userId, email: 'cliente@exemple.test', name: 'Camille Test', phone: '' },
    shipping: { line1: '1 rue de la Paix', line2: '', zipCode: '75002', city: 'Paris', country: 'FR' },
    gift: { wrap: true, message: 'Bienvenue Lou' }, stripe: { sessionId: id, paymentIntentId: '', eventId: '' },
    tracking: null, refund: null, emails: { cliente: 'en_attente', boutique: 'en_attente' },
  });
  return { id, reference };
}

test('cliente ordinaire : ni les commandes ni les stocks de la boutique', async ({ page }) => {
  await signIn(page, false);
  for (const path of ['/createur/commandes', '/createur/commandes/cs_test_x', '/createur/stocks']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/createur\/connexion$/);
  }
});

test('commande : préparation, expédition Colissimo (suivi visible par la cliente), livraison', async ({ browser }) => {
  const clientPage = await (await browser.newContext()).newPage();
  await clientPage.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
  const client = await signIn(clientPage, false);
  const { id, reference } = await seedOrder(client.uid);

  const page = await (await browser.newContext()).newPage();
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
  await signIn(page, true);
  await page.goto('/createur/commandes');
  await main(page).getByRole('link', { name: new RegExp(reference) }).click();
  await expect(main(page).getByText('Emballage cadeau — message à joindre : « Bienvenue Lou »')).toBeVisible();

  await main(page).getByRole('button', { name: 'Passer en préparation' }).click();
  await expect.poll(async () => (await db().doc(`orders/${id}`).get()).get('status')).toBe('preparing');

  const ship = main(page).getByRole('form', { name: 'Expédition' });
  await ship.getByLabel('Numéro de suivi').fill('<b>x</b>');
  await ship.getByRole('button', { name: 'Marquer comme expédiée' }).click();
  await expect(main(page).getByText(/Numéro de suivi invalide/)).toBeVisible();
  await ship.getByLabel('Numéro de suivi').fill('6a 1234 5678 901');
  await ship.getByRole('button', { name: 'Marquer comme expédiée' }).click();
  await expect.poll(async () => (await db().doc(`orders/${id}`).get()).get('status')).toBe('shipped');
  expect((await db().doc(`orders/${id}`).get()).data()).toMatchObject({
    tracking: { carrier: 'Colissimo', number: '6A12345678901', url: 'https://www.laposte.fr/outils/suivre-vos-envois?code=6A12345678901' },
    emails: { expedition: 'en_attente' },
  });

  // La cliente voit le suivi dans son compte.
  await clientPage.goto(`/compte/commandes/${id}`);
  await expect(clientPage.getByRole('main').getByText('Expédiée', { exact: false }).first()).toBeVisible();
  await expect(clientPage.getByRole('main').getByRole('link', { name: '6A12345678901' })).toHaveAttribute('href', /laposte\.fr/);

  await page.reload();
  await main(page).getByRole('button', { name: 'Marquer comme livrée' }).click();
  await expect.poll(async () => (await db().doc(`orders/${id}`).get()).get('status')).toBe('delivered');
  const audit = await db().collection('auditLog').where('target', '==', id).get();
  expect(audit.docs.map((d) => d.get('action')).sort()).toEqual(['commande.delivered', 'commande.preparing', 'commande.shipped']);
  await Promise.all([...audit.docs.map((d) => d.ref.delete()), db().doc(`orders/${id}`).delete()]);
});

test('stocks : modification en ligne, vente pendant la saisie jamais écrasée', async ({ page }) => {
  await signIn(page, true);
  const ref = db().doc(`produits/${FIXTURE.published.id}/variantes/unique`);
  const before = (await ref.get()).get('stock') as number;
  await page.goto('/createur/stocks');
  const input = main(page).getByLabel(`Stock ${FIXTURE.published.name} Unique`);
  await input.fill(String(before + 5));
  await main(page).getByRole('button', { name: `Enregistrer le stock ${FIXTURE.published.name} Unique` }).click();
  await expect.poll(async () => (await ref.get()).get('stock')).toBe(before + 5);

  await page.reload();
  await ref.update({ stock: before + 1 }); // vente pendant la saisie
  await main(page).getByLabel(`Stock ${FIXTURE.published.name} Unique`).fill('0');
  await main(page).getByRole('button', { name: `Enregistrer le stock ${FIXTURE.published.name} Unique` }).click();
  await expect(main(page).getByText(/Une vente a modifié ce stock/)).toBeVisible();
  expect((await ref.get()).get('stock')).toBe(before + 1);
  await ref.update({ stock: before });
});
