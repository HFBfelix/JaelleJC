// Étape 7a : espace créatrice, produits. Accès réservé à l'administratrice ; fiche guidée de la photo à la mise
// en ligne ; brouillon IA (faux serveur) ; stock protégé contre l'écrasement d'une vente ; archivage.
import { randomBytes } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { createUser } from './auth-helpers';
import { FIXTURE, db } from './catalogue-fixture';
import { FAKE_STRIPE_PORT } from './fake-stripe';

const FAKE = `http://127.0.0.1:${FAKE_STRIPE_PORT}`;
// Photo PNG de 1 × 1 pixel : réduite et convertie en JPEG par le navigateur avant l'envoi.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const main = (page: Page) => page.getByRole('main');
const E2E_PRODUCT_PREFIX = 'E2E créatrice'; // nettoyé par catalogue-fixture.ts

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'ordinateur', 'espace créatrice : surtout sur ordinateur');
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
});

async function signInAdmin(page: Page) {
  const admin = await createUser({ admin: true });
  await page.goto('/createur/connexion');
  await main(page).getByLabel('Votre e-mail').fill(admin.email);
  await main(page).getByRole('button', { name: 'Utiliser un mot de passe' }).click();
  await main(page).getByLabel('Mot de passe').fill(admin.password);
  await main(page).getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/createur$/);
  return admin;
}

async function newProduct(page: Page) {
  const name = `${E2E_PRODUCT_PREFIX} cape ${randomBytes(3).toString('hex')}`;
  await page.goto('/createur/produits');
  await main(page).getByRole('textbox', { name: 'Nouvelle pièce' }).fill(name);
  await main(page).getByRole('button', { name: 'Créer la fiche' }).click();
  await expect(page).toHaveURL(/\/createur\/produits\/[A-Za-z0-9]+$/);
  return { name, id: page.url().split('/').pop()! };
}

const step = (page: Page, name: RegExp) => main(page).getByRole('navigation', { name: 'Étapes de la fiche' }).getByRole('button', { name });

test('anonyme et cliente ordinaire : l’espace créatrice et l’aperçu renvoient à la connexion dédiée', async ({ page }) => {
  for (const path of ['/createur/produits', '/createur/produits/e2e-publie', '/createur/apercu/e2e-brouillon']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/createur\/connexion$/);
  }
  const user = await createUser();
  await page.goto('/createur/connexion');
  await main(page).getByLabel('Votre e-mail').fill(user.email);
  await main(page).getByRole('button', { name: 'Utiliser un mot de passe' }).click();
  await main(page).getByLabel('Mot de passe').fill(user.password);
  await main(page).getByRole('button', { name: 'Se connecter' }).click();
  for (const path of ['/createur/produits', '/createur/apercu/e2e-brouillon']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/createur\/connexion$/);
  }
});

test('fiche guidée : photo, essentiel, détails, variantes, brouillon IA relu, mise en ligne, archivage', async ({ page }) => {
  await signInAdmin(page);
  const { name, id } = await newProduct(page);

  // 1. Photo réduite dans le navigateur, rangée sous produits/<id>/ avec un nom aléatoire, texte alternatif.
  await main(page).locator('input[type=file]').setInputFiles({ name: 'IMG_0001.png', mimeType: 'image/png', buffer: PNG });
  await expect(main(page).getByLabel('Texte alternatif de la photo 1')).toBeVisible();
  await main(page).getByLabel('Texte alternatif de la photo 1').fill('Cape de bain écrue pliée');
  await main(page).getByRole('button', { name: 'Enregistrer l’ordre et les textes' }).click();
  await expect(main(page).getByText('Photos enregistrées.')).toBeVisible();
  const images = (await db().doc(`produits/${id}`).get()).get('images');
  expect(images).toEqual([expect.objectContaining({ alt: 'Cape de bain écrue pliée', order: 0 })]);
  expect(images[0].path).toMatch(new RegExp(`^produits/${id}/[0-9a-f-]{36}\\.jpg$`)); // jamais « IMG_0001 »

  // 2. L'essentiel.
  await step(page, /L’essentiel/).click();
  await main(page).getByLabel('Univers').selectOption(FIXTURE.category.slug);
  await main(page).getByLabel('Famille').selectOption('capes');
  await main(page).getByLabel('Prix TTC (€)').fill('45,50');
  await main(page).getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(main(page).getByText('Enregistré.')).toBeVisible();
  expect((await db().doc(`produits/${id}`).get()).get('priceCents')).toBe(4550);

  // 3. Détails (enregistrés automatiquement en changeant d'étape : brouillon).
  await step(page, /Détails/).click();
  await main(page).getByLabel('Matières').fill('gaze de coton');
  await main(page).getByLabel('Cas d’usage').fill('naissance\nbaptême');
  await step(page, /Variantes/).click();
  await expect(main(page).getByRole('button', { name: 'Enregistrer les variantes' })).toBeVisible();
  expect((await db().doc(`produits/${id}`).get()).get('usages')).toEqual(['naissance', 'baptême']);

  // 4. Variantes : stock de la variante unique.
  await main(page).getByLabel('Stock unique').fill('3');
  await main(page).getByRole('button', { name: 'Enregistrer les variantes' }).click();
  await expect.poll(async () => (await db().doc(`produits/${id}/variantes/unique`).get()).get('stock')).toBe(3);

  // 5. Textes : brouillon IA (seuls les faits saisis partent), « Utiliser », relecture.
  await step(page, /Textes/).click();
  await main(page).getByRole('button', { name: 'Proposer un brouillon' }).click();
  await main(page).getByRole('button', { name: 'Utiliser' }).first().click();
  await expect(main(page).getByLabel('Accroche (une phrase)')).toHaveValue('Une cape douce pour le premier bain.');
  await main(page).getByLabel('Description', { exact: true }).fill('Cape en gaze de coton, cousue dans notre atelier.');
  await main(page).getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(main(page).getByText('Enregistré.')).toBeVisible();
  const sent = JSON.stringify(await (await fetch(`${FAKE}/__test/ai`)).json());
  expect(sent).toContain('gaze de coton');
  expect(sent).not.toContain('@exemple.test'); // aucune donnée de compte envoyée à l'IA

  // Publication bloquée tant que le brouillon IA n'est pas relu.
  await step(page, /Publication/).click();
  await expect(main(page).getByText('Le brouillon IA relu (à compléter)')).toBeVisible();
  await expect(main(page).getByRole('button', { name: 'Mettre en ligne' })).toBeDisabled();
  await step(page, /Textes/).click();
  await main(page).getByRole('button', { name: 'J’ai relu les textes' }).click();
  await step(page, /Publication/).click();
  await main(page).getByRole('button', { name: 'Mettre en ligne' }).click();
  await expect(main(page).getByText('La pièce est en ligne.')).toBeVisible();

  const doc = (await db().doc(`produits/${id}`).get()).data()!;
  expect(doc).toMatchObject({ status: 'published', inStock: true });
  const res = await page.goto(`/produits/${doc.slug}`);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name })).toBeAttached();
  const audit = await db().collection('auditLog').where('target', '==', id).get();
  expect(audit.docs.map((d) => d.get('action'))).toEqual(expect.arrayContaining(['produit.cree', 'stock.modifie', 'produit.publie']));

  // Pièce en ligne : impossible de l'enregistrer incomplète.
  await page.goto(`/createur/produits/${id}`);
  await step(page, /Textes/).click();
  await main(page).getByLabel('Accroche (une phrase)').fill('');
  await main(page).getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(main(page).getByText(/Une pièce en ligne doit rester complète/)).toBeVisible();

  // Archivage : retirée du site.
  await step(page, /Publication/).click();
  await main(page).getByRole('button', { name: 'Archiver' }).click();
  await expect.poll(async () => (await db().doc(`produits/${id}`).get()).get('status')).toBe('archived');
  expect((await page.goto(`/produits/${doc.slug}`))?.status()).toBe(404);
});

test('stock : une vente pendant la saisie n’est jamais écrasée', async ({ page }) => {
  await signInAdmin(page);
  const { id } = await newProduct(page);
  await step(page, /Variantes/).click();
  await db().doc(`produits/${id}/variantes/unique`).update({ stock: 7 }); // modifié ailleurs (vente, autre onglet)
  await main(page).getByLabel('Stock unique').fill('2');
  await main(page).getByRole('button', { name: 'Enregistrer les variantes' }).click();
  await expect(main(page).getByText(/Une vente a modifié le stock/)).toBeVisible();
  expect((await db().doc(`produits/${id}/variantes/unique`).get()).get('stock')).toBe(7);
});

test('aperçu privé d’un brouillon ; le brouillon reste introuvable pour le public', async ({ page }) => {
  await signInAdmin(page);
  const { id } = await newProduct(page);
  await step(page, /L’essentiel/).click();
  await main(page).getByLabel('Prix TTC (€)').fill('30');
  await main(page).getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(main(page).getByText('Enregistré.')).toBeVisible();
  const slug = (await db().doc(`produits/${id}`).get()).get('slug');

  await page.goto(`/createur/apercu/${id}`);
  await expect(page.getByText(/Aperçu privé — pièce non publiée/)).toBeVisible();
  await expect(page.getByText('Aperçu : l’ajout à la sélection est désactivé.').first()).toBeAttached();
  expect((await page.goto(`/produits/${slug}`))?.status()).toBe(404);

  // Brouillon jamais publié : supprimable.
  await page.goto(`/createur/produits/${id}`);
  await step(page, /Publication/).click();
  page.once('dialog', (d) => d.accept());
  await main(page).getByRole('button', { name: 'Supprimer le brouillon' }).click();
  await expect(page).toHaveURL(/\/createur\/produits$/);
  expect((await db().doc(`produits/${id}`).get()).exists).toBe(false);
});
