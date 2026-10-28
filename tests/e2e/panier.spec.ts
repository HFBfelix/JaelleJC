// Étape 3 : panier persistant côté serveur (cookie, persistance, plafond au stock, expiration, accès refusé).
import { createHash } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { Timestamp } from 'firebase-admin/firestore';
import { FIXTURE, db } from './catalogue-fixture';

const noBanner = (page: Page) => page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
const badge = (page: Page) => page.getByRole('button', { name: /^Ma sélection/ });
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Votre sélection' });

async function addFrom(page: Page, slug: string) {
  await page.goto(`/produits/${slug}`);
  await page.getByRole('button', { name: 'Ajouter à la sélection' }).click();
  await expect(drawer(page).getByRole('status')).not.toBeEmpty();
  await drawer(page).getByRole('button', { name: 'Fermer la sélection' }).click();
}

async function cartDoc(page: Page) {
  const cookie = (await page.context().cookies()).find((c) => c.name === 'cart_token');
  expect(cookie).toBeDefined();
  const hash = createHash('sha256').update(cookie!.value).digest('hex');
  return { cookie: cookie!, hash, ref: db().collection('carts').doc(hash) };
}

test('3 pièces ajoutées, navigateur fermé, retour : tout est là', async ({ browser, page }) => {
  await noBanner(page);
  await addFrom(page, FIXTURE.published.slug);
  await addFrom(page, FIXTURE.cabas.slug);
  await addFrom(page, FIXTURE.cabas.slug);
  await expect(badge(page)).toHaveAccessibleName('Ma sélection (3)');

  // « Je ferme tout » : nouveau navigateur, seuls les cookies sont conservés (pas d'onglet, pas de mémoire).
  const state = await page.context().storageState();
  await page.context().close();
  const context = await browser.newContext({ storageState: { cookies: state.cookies, origins: [] } });
  const again = await context.newPage();
  await noBanner(again);
  await again.goto('/');
  await expect(badge(again)).toHaveAccessibleName('Ma sélection (3)');

  // Page panier : lignes, quantités et total relus côté serveur (89 + 2 × 45 = 179 €).
  await again.goto('/panier');
  await expect(again.getByRole('heading', { level: 1, name: 'Votre sélection' })).toBeVisible();
  await expect(again.getByRole('main').getByText(FIXTURE.cabas.name)).toBeVisible();
  await expect(again.getByRole('main').getByLabel('Quantité : 2')).toBeVisible();
  await expect(again.getByText(/^179 €$/).first()).toBeVisible();
  await context.close();
});

test('HTML initial : badge juste sans JavaScript, page panier non indexée', async ({ page, request }) => {
  await noBanner(page);
  await addFrom(page, FIXTURE.cabas.slug);
  const { cookie } = await cartDoc(page);
  const html = await (await request.get('/panier', { headers: { cookie: `cart_token=${cookie.value}` } })).text();
  expect(html).toContain('Ma sélection (1)');
  expect(html).toContain(FIXTURE.cabas.name);
  expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/);
});

test('plafond au stock : impossible de dépasser 2 pièces en stock', async ({ page }) => {
  await noBanner(page);
  await page.goto(`/produits/${FIXTURE.published.slug}`);
  const add = page.getByRole('button', { name: 'Ajouter à la sélection' });
  for (let i = 0; i < 2; i++) {
    await add.click();
    await expect(drawer(page).getByRole('status')).toHaveText('Ajouté à votre sélection');
    await drawer(page).getByRole('button', { name: 'Fermer la sélection' }).click();
  }
  await add.click();
  await expect(drawer(page).getByRole('status')).toHaveText('Quantité limitée par le stock disponible.');
  await expect(badge(page)).toHaveAccessibleName('Ma sélection (2)');
  await expect(drawer(page).getByRole('button', { name: `Ajouter une pièce : ${FIXTURE.published.name}` })).toBeDisabled();
});

test('quantités : +1, -1 et retrait depuis le tiroir', async ({ page }) => {
  await noBanner(page);
  await addFrom(page, FIXTURE.cabas.slug);
  await badge(page).click();
  await drawer(page).getByRole('button', { name: `Ajouter une pièce : ${FIXTURE.cabas.name}` }).click();
  await expect(badge(page)).toHaveAccessibleName('Ma sélection (2)');
  await drawer(page).getByRole('button', { name: `Retirer une pièce : ${FIXTURE.cabas.name}` }).click();
  await expect(badge(page)).toHaveAccessibleName('Ma sélection (1)');
  await drawer(page).getByRole('button', { name: 'Retirer', exact: true }).click();
  await expect(drawer(page).getByText('Votre sélection est vide.')).toBeVisible();
  await expect(badge(page)).toHaveAccessibleName('Ma sélection (0)');
});

test('cookie : HttpOnly, SameSite=Lax, 7 jours ; en base, seule l’empreinte et les identifiants', async ({ page, request }) => {
  await noBanner(page);
  await addFrom(page, FIXTURE.cabas.slug);
  const { cookie, hash, ref } = await cartDoc(page);
  expect(cookie).toMatchObject({ httpOnly: true, path: '/' });
  // Attributs lus dans l'en-tête du serveur (WebKit sous Windows rapporte mal SameSite) ; durée renouvelée à la visite.
  const setCookie = (await request.get('/', { headers: { cookie: `cart_token=${cookie.value}` } })).headers()['set-cookie'] ?? '';
  expect(setCookie).toMatch(/cart_token=[A-Za-z0-9_-]{43}; Path=\/; .*Max-Age=604800/);
  expect(setCookie).toMatch(/HttpOnly/);
  expect(setCookie).toMatch(/SameSite=lax/i);
  const days = (cookie.expires * 1000 - Date.now()) / 86_400_000;
  expect(days).toBeGreaterThan(6.9);
  expect(days).toBeLessThanOrEqual(7);
  expect(await page.evaluate(() => document.cookie)).not.toContain('cart_token');

  const snap = await ref.get();
  expect(snap.exists).toBe(true);
  const data = snap.data()!;
  expect(data.tokenHash).toBe(hash);
  expect(JSON.stringify(data)).not.toContain(cookie.value);
  expect(data.items).toEqual([{ productId: FIXTURE.cabas.id, variantId: 'unique', quantity: 1 }]); // ni prix, ni nom, ni image
  const expires = (data.expiresAt as Timestamp).toMillis();
  expect((expires - Date.now()) / 86_400_000).toBeGreaterThan(6.9);
});

test('panier expiré : plus rien au retour', async ({ page }) => {
  await noBanner(page);
  await addFrom(page, FIXTURE.cabas.slug);
  const { ref } = await cartDoc(page);
  await ref.update({ expiresAt: Timestamp.fromMillis(Date.now() - 1000) });
  await page.reload();
  await expect(badge(page)).toHaveAccessibleName('Ma sélection (0)');
});

test('cookie inventé ou trafiqué : panier vide, aucune erreur', async ({ browser }) => {
  for (const value of ['x'.repeat(43), 'pas-un-jeton', '../../etc/passwd']) {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    await context.addCookies([{ name: 'cart_token', value, url: test.info().project.use.baseURL ?? 'http://localhost:3000' }]);
    const page = await context.newPage();
    await noBanner(page);
    const res = await page.goto('/panier');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('main').getByText('Votre sélection est vide.')).toBeVisible();
    await context.close();
  }
});

test('autre visiteur : ne voit pas le panier d’un autre', async ({ browser, page }) => {
  await noBanner(page);
  await addFrom(page, FIXTURE.cabas.slug);
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await noBanner(otherPage);
  await otherPage.goto('/panier');
  await expect(badge(otherPage)).toHaveAccessibleName('Ma sélection (0)');
  await expect(otherPage.getByRole('main').getByText('Votre sélection est vide.')).toBeVisible();
  expect((await other.cookies()).find((c) => c.name === 'cart_token')).toBeUndefined(); // aucun cookie sans ajout
  await other.close();
});

test('le navigateur ne peut pas lire un panier dans la base (règles Firestore)', async ({ page, request }) => {
  await noBanner(page);
  await addFrom(page, FIXTURE.cabas.slug);
  const { hash } = await cartDoc(page);
  const url = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${process.env.FIREBASE_PROJECT_ID ?? 'demo-jaellejc'}/databases/(default)/documents/carts/${hash}`;
  expect((await request.get(url)).status()).toBe(403);
  expect((await request.patch(url, { data: { fields: { items: { arrayValue: {} } } } })).status()).toBe(403);
});

// Tests qui modifient une pièce partagée : un seul navigateur, pour ne pas se gêner entre projets.
test.describe('base modifiée après l’ajout', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'ordinateur', 'modifie le jeu de données partagé'));

  test('le prix suit la base, pas le panier', async ({ page }) => {
    await noBanner(page);
    await addFrom(page, FIXTURE.priced.slug);
    const product = db().doc(`produits/${FIXTURE.priced.id}`);
    try {
      await product.update({ priceCents: 3500 });
      await page.goto('/panier');
      await expect(page.getByText(/^35 €$/).first()).toBeVisible();
    } finally {
      await product.update({ priceCents: FIXTURE.priced.priceCents });
    }
  });

  test('pièce retirée de la vente : retirée du panier, avec un message', async ({ page }) => {
    await noBanner(page);
    await addFrom(page, FIXTURE.withdrawn.slug);
    const product = db().doc(`produits/${FIXTURE.withdrawn.id}`);
    try {
      await product.update({ status: 'draft' });
      await page.goto('/panier');
      await expect(page.getByRole('status')).toHaveText('Cette pièce vient de trouver preneur. Elle a été retirée de votre sélection.');
      await expect(page.getByRole('main').getByText('Votre sélection est vide.')).toBeVisible();
      const { ref } = await cartDoc(page);
      expect((await ref.get()).get('items')).toEqual([]);
    } finally {
      await product.update({ status: 'published' });
    }
  });
});
