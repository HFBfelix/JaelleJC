// Étape 6 : espace client. Commandes (lues pour la seule propriétaire), adresses, préremplissage du paiement,
// export et suppression des données. Les commandes sont posées directement dans l'émulateur (le webhook est
// couvert par paiement.spec.ts).
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test, expect, type Page } from '@playwright/test';
import { Timestamp } from 'firebase-admin/firestore';
import { createUser, userExists } from './auth-helpers';
import { FIXTURE, db } from './catalogue-fixture';
import { FAKE_STRIPE_PORT } from './fake-stripe';

const FAKE = `http://127.0.0.1:${FAKE_STRIPE_PORT}`;
const main = (page: Page) => page.getByRole('main');
const rand = (prefix: string) => `${prefix}_${randomBytes(10).toString('hex')}`;

test.beforeEach(async ({ page }, info) => {
  test.skip(!['ordinateur', 'mobile'].includes(info.project.name), 'parcours de compte : Chromium');
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
});

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

function order(userId: string, over: Record<string, unknown> = {}) {
  return {
    userId, reference: `JJC-261030-${randomBytes(2).toString('hex').toUpperCase()}`, status: 'delivered',
    createdAt: Timestamp.fromDate(new Date('2026-10-20T10:00:00Z')),
    items: [{ productId: 'p', variantId: 'v', sku: 'S', name: 'Cape E2E commandée', variantLabel: 'Écru', unitPriceCents: 8900, quantity: 1, image: '' }],
    amounts: { subtotalCents: 8900, deliveryCents: 690, totalCents: 9590 },
    customer: { uid: userId, email: 'x@exemple.test', name: 'Camille Test', phone: '' },
    shipping: { line1: '1 rue de la Paix', line2: '', zipCode: '75002', city: 'Paris', country: 'FR' },
    gift: { wrap: false, message: '' }, stripe: { sessionId: '', paymentIntentId: '', eventId: '' },
    tracking: null, refund: null,
    ...over,
  };
}

async function addAddress(page: Page, a: { label?: string; name: string; line1: string; zipCode: string; city: string }) {
  await main(page).getByRole('button', { name: 'Ajouter une adresse' }).click();
  const form = main(page).getByRole('form', { name: 'Nouvelle adresse' });
  if (a.label) await form.getByLabel('Nom de l’adresse (optionnel)').fill(a.label);
  await form.getByLabel('Nom et prénom').fill(a.name);
  await form.getByLabel('Adresse', { exact: true }).fill(a.line1);
  await form.getByLabel('Code postal').fill(a.zipCode);
  await form.getByLabel('Ville').fill(a.city);
  await form.getByRole('button', { name: 'Enregistrer l’adresse' }).click();
  await expect(form).toBeHidden();
}

test('anonyme : le compte et le détail d’une commande renvoient à la connexion', async ({ page }) => {
  await page.goto('/compte');
  await expect(page).toHaveURL(/\/connexion\?retour=%2Fcompte|\/connexion\?retour=\/compte/);
  await page.goto('/compte/commandes/cs_test_inconnue');
  await expect(page).toHaveURL(/\/connexion/);
});

test('commandes : la cliente voit les siennes (anciennes comprises), jamais celle d’une autre', async ({ page }) => {
  const user = await signIn(page);
  const mine = rand('cs_test');
  const legacy = `ancienne${randomBytes(6).toString('hex')}`;
  const other = rand('cs_test');
  const tracked = order(user.uid, {
    status: 'shipped', tracking: { carrier: 'Colissimo', number: '6A0001', url: 'https://www.laposte.fr/suivi?code=6A0001' },
    createdAt: Timestamp.fromDate(new Date('2026-10-28T10:00:00Z')),
  });
  const otherUser = await createUser();
  const legacyOrder: Record<string, unknown> = order(user.uid, { status: 'paid' });
  delete legacyOrder.reference; // commande migrée de l'ancien site : pas de référence
  await Promise.all([
    db().doc(`orders/${mine}`).set(tracked),
    db().doc(`orders/${legacy}`).set(legacyOrder),
    db().doc(`orders/${other}`).set(order(otherUser.uid, { reference: 'JJC-261030-AUTR' })),
  ]);

  await page.goto('/compte');
  const list = main(page).getByRole('region', { name: 'Mes commandes' });
  await expect(list.getByRole('link')).toHaveCount(2);
  await expect(list.getByRole('link').first()).toContainText(`Réf. ${tracked.reference}`); // plus récente d'abord
  await expect(list.getByRole('link').first()).toContainText('Expédiée');
  await expect(list.getByText(`Réf. ${legacy.slice(0, 8).toUpperCase()}`)).toBeVisible();
  await expect(list).not.toContainText('JJC-261030-AUTR');

  await list.getByRole('link').first().click();
  await expect(page).toHaveURL(new RegExp(`/compte/commandes/${mine}$`));
  await expect(main(page).getByRole('heading', { level: 1 })).toHaveText(`Commande ${tracked.reference}`);
  await expect(main(page).getByText('1 × Cape E2E commandée — Écru')).toBeVisible();
  await expect(main(page).getByRole('link', { name: '6A0001' })).toHaveAttribute('href', 'https://www.laposte.fr/suivi?code=6A0001');

  // Commande d'une autre cliente, ou inconnue : même page introuvable.
  for (const id of [other, 'cs_test_nexistepas', '..%2F..%2Fusers']) {
    const res = await page.goto(`/compte/commandes/${id}`);
    expect(res?.status()).toBe(404);
    await expect(main(page)).not.toContainText('JJC-261030-AUTR');
  }
});

test('adresses : ajout, modification, suppression ; rangées sous le compte', async ({ page }) => {
  const user = await signIn(page);
  await addAddress(page, { label: 'Maison', name: 'Camille Test', line1: '3 rue des Lilas', zipCode: '75011', city: 'Paris' });
  const book = main(page).getByRole('region', { name: 'Mes adresses' });
  await expect(book.getByText('3 rue des Lilas')).toBeVisible();
  const docs = await db().collection(`users/${user.uid}/adresses`).get();
  expect(docs.docs.map((d) => d.data())).toEqual([
    { label: 'Maison', name: 'Camille Test', line1: '3 rue des Lilas', line2: '', zipCode: '75011', city: 'Paris', country: 'FR', phone: '' },
  ]);

  await book.getByRole('button', { name: 'Modifier l’adresse Maison' }).click();
  const form = main(page).getByRole('form', { name: 'Modifier l’adresse' });
  await form.getByLabel('Ville').fill('Montreuil');
  await form.getByLabel('Code postal').fill('93100');
  await form.getByRole('button', { name: 'Enregistrer l’adresse' }).click();
  await expect(book.getByText('93100 Montreuil')).toBeVisible();

  await book.getByRole('button', { name: 'Supprimer l’adresse Maison' }).click();
  await expect(book.getByText('3 rue des Lilas')).toBeHidden();
  expect((await db().collection(`users/${user.uid}/adresses`).get()).size).toBe(0);
});

test('adresses : 5 au plus, la sixième est refusée par le serveur', async ({ page }) => {
  const user = await signIn(page);
  const a = { label: '', name: 'Camille Test', line1: '1 rue A', line2: '', zipCode: '75001', city: 'Paris', country: 'FR', phone: '' };
  await Promise.all([1, 2, 3, 4, 5].map((n) => db().doc(`users/${user.uid}/adresses/a${n}`).set({ ...a, label: `Adresse ${n}` })));
  await page.reload();
  await main(page).getByRole('button', { name: 'Ajouter une adresse' }).click();
  const form = main(page).getByRole('form', { name: 'Nouvelle adresse' });
  await form.getByLabel('Nom et prénom').fill('Sixième');
  await form.getByLabel('Adresse', { exact: true }).fill('6 rue F');
  await form.getByLabel('Code postal').fill('75006');
  await form.getByLabel('Ville').fill('Paris');
  await form.getByRole('button', { name: 'Enregistrer l’adresse' }).click();
  await expect(main(page).getByText('Vous avez déjà 5 adresses. Supprimez-en une pour en ajouter une nouvelle.')).toBeVisible();
  expect((await db().collection(`users/${user.uid}/adresses`).get()).size).toBe(5);
});

test('reconnexion demandée : la page de connexion s’affiche même avec une session ouverte', async ({ page }) => {
  await signIn(page);
  await page.goto('/connexion?retour=/compte&info=reconnexion');
  await expect(page).toHaveURL(/info=reconnexion/);
  await expect(main(page).getByText('Par sécurité, reconnectez-vous pour confirmer cette action.')).toBeVisible();
  await page.goto('/connexion?retour=/compte');
  await expect(page).toHaveURL(/\/compte$/); // sans demande : retour direct
});

test('export : un fichier avec le compte, les adresses et les commandes de la seule cliente', async ({ page }) => {
  const user = await signIn(page);
  const mine = rand('cs_test');
  const otherUser = await createUser();
  await db().doc(`orders/${mine}`).set(order(user.uid, { reference: 'JJC-261030-MOIE' }));
  await db().doc(`orders/${rand('cs_test')}`).set(order(otherUser.uid, { reference: 'JJC-261030-AUTR' }));
  await page.reload();
  await addAddress(page, { name: 'Camille Test', line1: '5 rue Export', zipCode: '69001', city: 'Lyon' });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    main(page).getByRole('button', { name: 'Télécharger mes données' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('mes-donnees-jaelle-jc.json');
  const data = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(data.compte.email).toBe(user.email);
  expect(data.adresses).toEqual([expect.objectContaining({ line1: '5 rue Export', zipCode: '69001' })]);
  expect(data.commandes.map((o: { reference: string }) => o.reference)).toEqual(['JJC-261030-MOIE']);
  expect(data.commandes[0].contact).toEqual({ email: 'x@exemple.test', phone: '' });
  expect(JSON.stringify(data)).not.toContain(otherUser.uid);
});

test('suppression refusée tant qu’une commande est en cours', async ({ page }) => {
  const user = await signIn(page);
  await db().doc(`orders/${rand('cs_test')}`).set(order(user.uid, { status: 'preparing' }));
  await page.reload();
  await main(page).getByRole('button', { name: 'Supprimer mon compte' }).click();
  await main(page).getByLabel('Je confirme la suppression de mon compte.').check();
  await main(page).getByRole('button', { name: 'Supprimer définitivement' }).click();
  await expect(main(page).getByText(/Une commande est encore en cours/)).toBeVisible();
  expect(await userExists(user.uid)).toBe(true);
});

test('suppression : compte, profil, adresses et panier effacés ; commandes gardées sans lien', async ({ page }) => {
  const user = await signIn(page);
  const orderId = rand('cs_test');
  await db().doc(`orders/${orderId}`).set(order(user.uid));
  await db().doc(`users/${user.uid}`).set({ displayName: 'Camille' });
  await page.reload();
  await addAddress(page, { name: 'Camille Test', line1: '7 rue Effacée', zipCode: '75003', city: 'Paris' });

  await main(page).getByRole('button', { name: 'Supprimer mon compte' }).click();
  await expect(main(page).getByRole('button', { name: 'Supprimer définitivement' })).toBeDisabled();
  await main(page).getByLabel('Je confirme la suppression de mon compte.').check();
  await main(page).getByRole('button', { name: 'Supprimer définitivement' }).click();
  await expect(page).toHaveURL(/\/compte\/supprime$/);
  await expect(main(page).getByRole('heading', { level: 1 })).toHaveText('Votre compte est supprimé.');

  expect(await userExists(user.uid)).toBe(false);
  expect((await db().doc(`users/${user.uid}`).get()).exists).toBe(false);
  expect((await db().collection(`users/${user.uid}/adresses`).get()).size).toBe(0);
  expect((await db().doc(`carts/u_${user.uid}`).get()).exists).toBe(false);
  const kept = (await db().doc(`orders/${orderId}`).get()).data();
  expect(kept).toMatchObject({ userId: null, customer: { uid: null }, amounts: { totalCents: 9590 } });

  await page.goto('/compte');
  await expect(page).toHaveURL(/\/connexion/); // session fermée
});

test.describe('préremplissage du paiement (faux Stripe)', () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'ordinateur', 'un seul navigateur suffit');
    test.skip(!process.env.STRIPE_WEBHOOK_SECRET, 'STRIPE_WEBHOOK_SECRET requis (faux Stripe local)');
  });

  const sessionParams = async (id: string) => (await (await fetch(`${FAKE}/__test/sessions/${id}`)).json()) as Record<string, string>;
  const customer = async (id: string) =>
    (await (await fetch(`${FAKE}/__test/customers/${id}`)).json()) as { params: Record<string, string>; deleted: boolean };

  async function pay(page: Page, choice?: RegExp) {
    await page.goto('/panier');
    if (choice) await main(page).getByRole('radio', { name: choice }).check();
    await main(page).getByRole('button', { name: 'Confirmer et payer' }).click();
    await page.waitForURL(/\/pay\/cs_test_/);
    return sessionParams(page.url().split('/pay/')[1]!);
  }

  test('adresse choisie : client Stripe prérempli ; autre adresse : rien de prérempli ; suppression : client effacé', async ({ page }) => {
    const user = await signIn(page);
    await addAddress(page, { label: 'Grands-parents', name: 'Dominique Test', line1: '9 place du Marché', zipCode: '78000', city: 'Versailles' });
    await page.goto(`/produits/${FIXTURE.buy.slug}`);
    await page.getByRole('button', { name: 'Ajouter à la sélection' }).click();
    await expect(page.getByRole('dialog', { name: 'Votre sélection' }).getByRole('status')).toHaveText('Ajouté à votre sélection');

    await page.goto('/panier');
    await expect(main(page).getByRole('radio', { name: /Grands-parents/ })).toBeChecked(); // première adresse par défaut
    const withAddress = await pay(page);
    expect(withAddress.customer).toMatch(/^cus_/);
    expect(withAddress.customer_email).toBeUndefined();
    expect(withAddress['line_items[0][price_data][unit_amount]']).toBe(String(FIXTURE.buy.priceCents));
    const c = await customer(withAddress.customer!);
    expect(c.params).toMatchObject({
      email: user.email, 'shipping[name]': 'Dominique Test', 'shipping[address][line1]': '9 place du Marché',
      'shipping[address][postal_code]': '78000', 'shipping[address][city]': 'Versailles', 'shipping[address][country]': 'FR',
      'metadata[uid]': user.uid,
    });
    expect((await db().doc(`stripeCustomers/${user.uid}`).get()).get('customerId')).toBe(withAddress.customer);

    const again = await pay(page);
    expect(again.customer).toBe(withAddress.customer); // même client, mis à jour

    const other = await pay(page, /Une autre adresse/);
    expect(other.customer).toBeUndefined();
    expect(other.customer_email).toBe(user.email);

    // Suppression du compte (paiements ouverts depuis moins de 30 minutes : refusée d'abord).
    await page.goto('/compte');
    await main(page).getByRole('button', { name: 'Supprimer mon compte' }).click();
    await main(page).getByLabel('Je confirme la suppression de mon compte.').check();
    await main(page).getByRole('button', { name: 'Supprimer définitivement' }).click();
    await expect(main(page).getByText(/Un paiement vient d’être commencé/)).toBeVisible();

    const old = Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000));
    const open = await db().collection('checkouts').where('uid', '==', user.uid).get();
    await Promise.all(open.docs.map((d) => d.ref.update({ createdAt: old }))); // sessions expirées
    await main(page).getByRole('button', { name: 'Supprimer définitivement' }).click();
    await expect(page).toHaveURL(/\/compte\/supprime$/);
    expect((await customer(withAddress.customer!)).deleted).toBe(true);
    expect((await db().doc(`stripeCustomers/${user.uid}`).get()).exists).toBe(false);
  });
});
