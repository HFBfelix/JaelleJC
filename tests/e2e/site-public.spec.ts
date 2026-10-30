// Inscription à la newsletter (pied de page) et recherche de la collection (accents, univers, plusieurs mots).
import { randomBytes } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { FIXTURE, db } from './catalogue-fixture';

const main = (page: Page) => page.getByRole('main');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
});

test('newsletter : inscription enregistrée par le serveur, message de réussite, une seule fois par adresse', async ({ page }) => {
  const email = `e2e-news-${randomBytes(4).toString('hex')}@exemple.test`;
  for (let i = 0; i < 2; i++) {
    await page.goto('/');
    await page.getByLabel('Votre adresse e-mail').fill(email.toUpperCase());
    await page.getByRole('button', { name: "S'inscrire" }).click();
    await expect(page.getByText('Vous faites désormais partie de l’Atelier.').or(page.getByText("Vous faites désormais partie de l'Atelier."))).toBeVisible();
  }
  const docs = await db().collection('newsletter').where('email', '==', email).get();
  expect(docs.size).toBe(1);
  expect(docs.docs[0]!.data()).toMatchObject({ email, source: 'footer_site' });
  await docs.docs[0]!.ref.delete();
});

test('recherche : sans accents, par univers, plusieurs mots', async ({ page }) => {
  const name = FIXTURE.published.name; // « Cape E2E », univers « Naissance E2E »
  for (const q of ['cape', 'CAPE e2e', 'naissance', 'naissance cape']) {
    await page.goto(`/collection?search=${encodeURIComponent(q)}`);
    await expect(main(page).getByText(name, { exact: true }).first()).toBeVisible();
  }
  await page.goto('/collection?search=zzzz-introuvable');
  await expect(main(page).getByText(name, { exact: true })).toHaveCount(0);
});
