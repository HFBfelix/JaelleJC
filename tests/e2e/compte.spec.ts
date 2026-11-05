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

async function signIn(page: Page, { profile = true } = {}) {
  const user = await createUser({ profile });
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
  if (!page.url().endsWith('/compte/adresses')) await page.goto('/compte/adresses');
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
  for (const path of ['/compte/commandes', '/compte/coordonnees', '/compte/adresses', '/compte/securite', '/compte/donnees']) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/connexion\?retour=/);
  }
});

test('accueil : commande en cours et suivi en tête, puis un thème par page', async ({ page }, info) => {
  const user = await signIn(page);
  const home = main(page);
  await expect(home.getByRole('region', { name: 'Dernière commande' })).toContainText('Aucune commande pour le moment.');
  await expect(home.getByRole('link', { name: 'Découvrir la collection' })).toHaveAttribute('href', '/collection');

  const shipped = rand('cs_test');
  await Promise.all([
    db().doc(`orders/${shipped}`).set(order(user.uid, {
      reference: 'JJC-261104-ENCO', status: 'shipped', createdAt: Timestamp.fromDate(new Date('2026-10-25T10:00:00Z')),
      tracking: { carrier: 'Colissimo', number: '6A0002', url: 'https://www.laposte.fr/suivi?code=6A0002' },
    })),
    db().doc(`orders/${rand('cs_test')}`).set(order(user.uid, { reference: 'JJC-261104-LIVR', createdAt: Timestamp.fromDate(new Date('2026-10-30T10:00:00Z')) })),
  ]);
  await page.reload();
  const current = home.getByRole('region', { name: 'Commande en cours' });
  await expect(current).toContainText('JJC-261104-ENCO'); // en cours avant la livrée, même plus ancienne
  await expect(current).not.toContainText('JJC-261104-LIVR');
  await expect(current.getByRole('link', { name: 'Suivre mon colis' })).toHaveAttribute('href', 'https://www.laposte.fr/suivi?code=6A0002');
  await current.getByRole('link', { name: 'Toutes mes commandes' }).click();
  await expect(page).toHaveURL(/\/compte\/commandes$/);
  await expect(main(page).getByRole('heading', { level: 1 })).toHaveText('Mes commandes');
  await expect(main(page).getByRole('region', { name: 'Mes commandes' }).getByRole('link')).toHaveCount(2);

  if (info.project.name === 'mobile') {
    // Mobile : retour vers l'accueil, puis le menu en liste.
    await main(page).getByRole('link', { name: '← Mon compte' }).click();
    await expect(page).toHaveURL(/\/compte$/);
    await main(page).getByRole('navigation', { name: 'Rubriques du compte' }).getByRole('link', { name: 'Mes adresses' }).click();
  } else {
    // Ordinateur : menu à gauche, page en cours signalée ; résumés sur l'accueil.
    const nav = page.getByRole('navigation', { name: 'Mon compte' });
    await expect(nav.getByRole('link', { name: 'Mes commandes' })).toHaveAttribute('aria-current', 'page');
    await nav.getByRole('link', { name: 'Mon compte' }).click();
    await expect(main(page).getByRole('region', { name: 'Connexion et sécurité' })).toContainText(user.email);
    await expect(main(page).getByRole('region', { name: 'Mes coordonnées' })).toContainText('Camille Test');
    await main(page).getByRole('link', { name: 'Gérer : Mes adresses' }).click();
  }
  await expect(page).toHaveURL(/\/compte\/adresses$/);
  await expect(main(page).getByRole('heading', { level: 1 })).toHaveText('Mes adresses');
  // « Mes données » reste à part : rien de l'export ni de la suppression ailleurs.
  await expect(main(page).getByRole('button', { name: 'Supprimer mon compte' })).toHaveCount(0);
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

  await page.goto('/compte/commandes');
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
  await page.goto('/compte/adresses');
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

test('reconnexion depuis « Connexion et sécurité » ou « Mes données » : retour sur la même page', async ({ page }) => {
  const user = await signIn(page);
  for (const path of ['/compte/securite', '/compte/donnees']) {
    await page.goto(`/connexion?retour=${path}&info=reconnexion`);
    await main(page).getByLabel('Votre e-mail').fill(user.email);
    await main(page).getByRole('button', { name: 'Utiliser un mot de passe' }).click();
    await main(page).getByLabel('Mot de passe').fill(user.password);
    await main(page).getByRole('button', { name: 'Se connecter' }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
  // Adresse hors de la liste : accueil du compte, jamais ailleurs.
  await page.goto('/connexion?retour=https://evil.example');
  await expect(page).toHaveURL(/\/compte$/);
});

test('export : un fichier avec le compte, les adresses et les commandes de la seule cliente', async ({ page }) => {
  const user = await signIn(page);
  const mine = rand('cs_test');
  const otherUser = await createUser();
  await db().doc(`orders/${mine}`).set(order(user.uid, { reference: 'JJC-261030-MOIE' }));
  await db().doc(`orders/${rand('cs_test')}`).set(order(otherUser.uid, { reference: 'JJC-261030-AUTR' }));
  await addAddress(page, { name: 'Camille Test', line1: '5 rue Export', zipCode: '69001', city: 'Lyon' });

  await page.goto('/compte/donnees');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    main(page).getByRole('button', { name: 'Télécharger mes données' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('mes-donnees-jaelle-jc.json');
  const data = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(data.compte.email).toBe(user.email);
  expect(data.adresses).toEqual([expect.objectContaining({ line1: '5 rue Export', zipCode: '69001' })]);
  expect(data.commandes.map((o: { reference: string }) => o.reference)).toEqual(['JJC-261030-MOIE']);
  expect(data.commandes[0].contact).toEqual({ name: 'Camille Test', email: 'x@exemple.test', phone: '' }); // personne qui a commandé
  expect(JSON.stringify(data)).not.toContain(otherUser.uid);
});

test('suppression refusée tant qu’une commande est en cours', async ({ page }) => {
  const user = await signIn(page);
  await db().doc(`orders/${rand('cs_test')}`).set(order(user.uid, { status: 'preparing' }));
  await page.goto('/compte/donnees');
  await main(page).getByRole('button', { name: 'Supprimer mon compte' }).click();
  await main(page).getByRole('dialog', { name: 'Supprimer mon compte' }).getByRole('button', { name: 'OK' }).click();
  await expect(main(page).getByText(/Une commande est encore en cours/)).toBeVisible();
  expect(await userExists(user.uid)).toBe(true);
});

test('suppression : compte, profil, adresses et panier effacés ; commandes gardées sans lien', async ({ page }) => {
  const user = await signIn(page);
  const orderId = rand('cs_test');
  await db().doc(`orders/${orderId}`).set(order(user.uid));
  await db().doc(`users/${user.uid}`).set({ displayName: 'Camille' });
  await addAddress(page, { name: 'Camille Test', line1: '7 rue Effacée', zipCode: '75003', city: 'Paris' });

  await page.goto('/compte/donnees');
  // Fenêtre de confirmation simple : « Annuler » (ou Échap) ferme sans rien supprimer ; « OK » supprime.
  await main(page).getByRole('button', { name: 'Supprimer mon compte' }).click();
  await main(page).getByRole('dialog', { name: 'Supprimer mon compte' }).getByRole('button', { name: 'Annuler' }).click();
  await expect(main(page).getByRole('dialog', { name: 'Supprimer mon compte' })).toBeHidden();
  await main(page).getByRole('button', { name: 'Supprimer mon compte' }).click();
  await page.keyboard.press('Escape');
  await expect(main(page).getByRole('dialog', { name: 'Supprimer mon compte' })).toBeHidden();
  expect(await userExists(user.uid)).toBe(true);
  await main(page).getByRole('button', { name: 'Supprimer mon compte' }).click();
  await main(page).getByRole('dialog', { name: 'Supprimer mon compte' }).getByRole('button', { name: 'OK' }).click();
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

  async function pay(page: Page) {
    await main(page).getByRole('button', { name: 'Confirmer et payer' }).click();
    await page.waitForURL(/\/pay\/cs_test_/);
    return sessionParams(page.url().split('/pay/')[1]!);
  }

  test('livraison confirmée avant Stripe : résumé avec l’adresse du compte, cadeau à une autre personne enregistré à la demande ; suppression : client effacé', async ({ page }) => {
    const user = await signIn(page);
    await addAddress(page, { label: 'Grands-parents', name: 'Dominique Test', line1: '9 place du Marché', zipCode: '78000', city: 'Versailles' });
    await page.goto(`/produits/${FIXTURE.buy.slug}`);
    await page.getByRole('button', { name: 'Ajouter à la sélection' }).click();
    await expect(page.getByRole('dialog', { name: 'Votre sélection' }).getByRole('status')).toHaveText('Ajouté à votre sélection');

    await page.goto('/panier');
    const form = main(page).getByRole('group', { name: 'Livraison' });
    // Compte complet avec une adresse : simple résumé, au nom et au téléphone du profil (pas de saisie).
    const summary = form.getByLabel('Adresse de livraison');
    await expect(summary).toContainText('Camille Test');
    await expect(summary).toContainText('78000 Versailles');
    await expect(summary).toContainText('+33 6 00 00 00 00');
    await expect(form.getByLabel('Code postal')).toHaveCount(0);

    const withAddress = await pay(page);
    expect(withAddress.customer).toMatch(/^cus_/);
    expect(withAddress.customer_email).toBeUndefined();
    expect(withAddress['line_items[0][price_data][unit_amount]']).toBe(String(FIXTURE.buy.priceCents));
    const c = await customer(withAddress.customer!);
    expect(c.params).toMatchObject({
      email: user.email, phone: '+33600000000', 'shipping[name]': 'Camille Test', 'shipping[address][line1]': '9 Place du Marché', // écriture officielle (Base Adresse Nationale)
      'shipping[address][postal_code]': '78000', 'shipping[address][city]': 'Versailles', 'shipping[address][country]': 'FR',
      'shipping[phone]': '+33600000000', 'metadata[uid]': user.uid,
    });
    expect((await db().doc(`stripeCustomers/${user.uid}`).get()).get('customerId')).toBe(withAddress.customer);
    expect((await db().collection(`users/${user.uid}/adresses`).get()).size).toBe(1); // non enregistrée sans demande

    // Cadeau livré à une autre personne, nouvelle adresse enregistrée à la demande ; même client Stripe, mis à jour.
    await page.goto('/panier');
    await form.getByLabel('Cadeau livré à une autre personne').check();
    await form.getByLabel('Mes adresses').selectOption({ label: 'Nouvelle adresse' });
    await form.getByLabel('Prénom du destinataire').fill('Lou');
    await form.getByLabel('Nom du destinataire', { exact: true }).fill('Test');
    await form.getByLabel('Téléphone du destinataire').fill('7 00 00 00 01');
    await form.getByLabel('Adresse', { exact: true }).fill('3 rue Neuve');
    await form.getByLabel('Code postal').fill('69001');
    await form.getByLabel('Ville').fill('Lyon');
    await form.getByLabel('Enregistrer cette adresse dans mon compte').check();
    const again = await pay(page);
    expect(again.customer).toBe(withAddress.customer);
    expect((await customer(again.customer!)).params['shipping[address][city]']).toBe('Lyon');
    const saved = (await db().collection(`users/${user.uid}/adresses`).get()).docs.map((d) => d.data());
    expect(saved).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'Lou Test', city: 'Lyon', phone: '+33700000001' })]));

    // Suppression du compte (paiements ouverts depuis moins de 30 minutes : refusée d'abord).
    await page.goto('/compte/donnees');
    await main(page).getByRole('button', { name: 'Supprimer mon compte' }).click();
    await main(page).getByRole('dialog', { name: 'Supprimer mon compte' }).getByRole('button', { name: 'OK' }).click();
    await expect(main(page).getByText(/Un paiement vient d’être commencé/)).toBeVisible();

    const old = Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000));
    const open = await db().collection('checkouts').where('uid', '==', user.uid).get();
    await Promise.all(open.docs.map((d) => d.ref.update({ createdAt: old }))); // sessions expirées
    await main(page).getByRole('dialog', { name: 'Supprimer mon compte' }).getByRole('button', { name: 'OK' }).click();
    await expect(page).toHaveURL(/\/compte\/supprime$/);
    expect((await customer(withAddress.customer!)).deleted).toBe(true);
    expect((await db().doc(`stripeCustomers/${user.uid}`).get()).exists).toBe(false);
  });
});

test('faisons connaissance : civilité, prénom, nom et téléphone obligatoires ; salutation adaptée ; export', async ({ page }) => {
  const user = await signIn(page, { profile: false });
  const intro = main(page).getByRole('region', { name: 'Faisons connaissance' });
  await expect(intro).toBeVisible();
  await expect(main(page).getByText(/^Bonjour/)).toHaveCount(0);

  // Tant qu'un champ manque, rien ne s'enregistre.
  await intro.getByLabel('Prénom').fill('Camille');
  await expect(intro.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  await intro.getByLabel('Civilité').selectOption({ label: 'Madame' });
  await intro.getByLabel('Nom', { exact: true }).fill('Martin');
  await expect(intro.getByText('+33')).toBeVisible(); // indicatif français affiché devant le numéro
  await intro.getByLabel('Téléphone').fill('06 12 34 56 78');
  await intro.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(main(page).getByText('Bonjour Madame Martin', { exact: true })).toBeVisible();
  expect((await db().doc(`users/${user.uid}`).get()).data()).toMatchObject({ civilite: 'madame', prenom: 'Camille', nom: 'Martin', telephone: '+33612345678' });

  await expect(intro).toBeHidden(); // coordonnées complètes : l'accueil n'affiche plus le formulaire

  // « Ne pas préciser » : salutation par le prénom (page « Mes coordonnées »).
  await page.goto('/compte/coordonnees');
  const profile = main(page).getByRole('region', { name: 'Mes coordonnées' });
  await expect(profile.getByLabel('Téléphone')).toHaveValue('6 12 34 56 78');
  await profile.getByLabel('Civilité').selectOption({ label: 'Ne pas préciser' });
  await profile.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(profile.getByText('C’est noté.')).toBeVisible();
  await page.goto('/compte');
  await expect(main(page).getByText('Bonjour Camille', { exact: true })).toBeVisible();
  await page.goto('/compte/coordonnees');

  // Numéro étranger : refusé par le serveur.
  await profile.getByLabel('Téléphone').fill('20 7946 0000 1');
  await profile.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(profile.getByText(/téléphone français sont obligatoires/)).toBeVisible();

  // L'export des données contient les coordonnées.
  await page.goto('/compte/donnees');
  const download = page.waitForEvent('download');
  await main(page).getByRole('button', { name: /Télécharger mes données/ }).click();
  const file = await readFile((await (await download).path())!, 'utf8');
  expect(JSON.parse(file).profil).toMatchObject({ civilite: 'non-precise', prenom: 'Camille', nom: 'Martin', telephone: '+33612345678' });
});
