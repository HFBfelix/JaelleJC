// Comparaison visuelle du Layout (en-tête, catégories, menu, newsletter, pied de page, bandeau cookies).
// Références : prises sur l'ancien site (legacy/) avec `npm run visual:reference`.
// Comparaison : `npm run test:visual` contre le site Next.js.
import { test, expect, type Page } from '@playwright/test';

const CONSENT_KEY = 'jaellejc-cookies';

async function ready(page: Page) {
  // Pas de « networkidle » : l'ancien site garde une connexion Firestore ouverte.
  await page.waitForLoadState('load');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode().catch(() => undefined)));
  });
  await page.waitForTimeout(500);
}

async function openWithConsent(page: Page, path = '/') {
  await page.addInitScript((key) => localStorage.setItem(key, 'none'), CONSENT_KEY);
  await page.goto(path);
  await ready(page);
}

// Le contenu de la page diffère (accueil complet / squelette) et décale le bas du Layout d'une
// fraction de pixel : on le masque pour comparer le Layout seul.
async function hidePageContent(page: Page) {
  await page.addStyleTag({ content: 'main > * { display: none !important; }' });
  await page.waitForTimeout(200);
}

test('en-tête', async ({ page }) => {
  await openWithConsent(page);
  await expect(page.locator('header').first()).toHaveScreenshot('en-tete.png');
});

test('barre des catégories', async ({ page }) => {
  await openWithConsent(page);
  const nav = page.locator('nav.fixed').first();
  await expect(nav).toContainText(/bébé/i);
  await expect(nav).toHaveScreenshot('categories.png');
});

test('menu ouvert', async ({ page }) => {
  await openWithConsent(page);
  await page.locator('header button').first().click(); // sur mobile, le mot « Menu » est masqué
  await page.waitForTimeout(900); // transition de 700 ms
  await expect(page).toHaveScreenshot('menu.png');
});

test('bloc newsletter', async ({ page }) => {
  await openWithConsent(page);
  await hidePageContent(page);
  const section = page.locator('section', { hasText: 'Restez informé' });
  await expect(section).toHaveScreenshot('newsletter.png');
});

test('pied de page', async ({ page }) => {
  await openWithConsent(page);
  await hidePageContent(page);
  await expect(page.locator('footer').last()).toHaveScreenshot('pied-de-page.png');
});

test('bandeau cookies', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const card = page.locator('div', { hasText: 'Confidentialité' }).filter({ has: page.getByRole('button', { name: 'Tout accepter' }) }).last();
  await expect(card).toHaveScreenshot('bandeau-cookies.png');
});
