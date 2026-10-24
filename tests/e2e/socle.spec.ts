// Socle : en-têtes de sécurité, HTML rendu côté serveur, navigation du Layout.
import { test, expect } from '@playwright/test';

test('en-têtes de sécurité présents', async ({ request }) => {
  const res = await request.get('/');
  const h = res.headers();
  expect(h['strict-transport-security']).toBe('max-age=63072000');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['x-powered-by']).toBeUndefined();
});

test('le HTML initial contient le Layout (sans JavaScript)', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain('<html lang="fr"');
  expect(html).toContain('Restez informé de nos prochaines créations');
  expect(html).toContain('Header_site_drapeau.png');
  expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  expect(html).toContain('<title>Jaelle &amp; JC | Cadeau de naissance cousu main, Île-de-France</title>');
  // Aucun traceur dans le HTML servi.
  expect(html).not.toMatch(/googletagmanager|gtag\/js/);
});

test('menu : ouverture et fermeture', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await expect(page.getByRole('button', { name: 'Fermer le menu' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Collections' })).toBeVisible();
  await page.getByRole('button', { name: 'Fermer le menu' }).click();
  await expect(page.getByRole('button', { name: 'Collections' })).toBeHidden();
});

test('catégories de la barre secondaire', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
  await page.goto('/');
  const nav = page.locator('nav.fixed');
  for (const name of ['Bébé', 'Coffrets', 'Femmes']) {
    await expect(nav.getByRole('link', { name })).toHaveAttribute('href', `/collection?category=${encodeURIComponent(name)}`);
  }
});
