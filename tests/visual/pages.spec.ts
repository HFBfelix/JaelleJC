// Comparaison visuelle des pages du catalogue (étape 2) : ancien site (SITE=legacy) / nouveau site.
// Même catalogue des deux côtés : ancien format pour l'ancien site, format migré pour le nouveau.
// Zones masquées (différences voulues ou animées) : diaporama de l'accueil (animation continue),
// colonne d'informations de la fiche produit (descriptions réparties, demande de Jaelle du 2026-10-24),
// image de l'article « jersey » (lien cassé dans l'ancien site, corrigé).
import { test, expect, type Page } from '@playwright/test';

const legacy = process.env.SITE === 'legacy';
const PRODUCT = legacy ? '/product/MnXZRalzF37is34LXPmx' : '/produits/coffret-bebe-blanc-imprime-petales-de-fleur';
const ARTICLE = legacy ? '/blog/4' : '/blog/des-essentiels-bebes-intemporels-et-made-in-france';

// Défile toute la page (images chargées au défilement), puis attend polices et images visibles.
async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    window.scrollTo(0, 0);
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline && [...document.images].some((img) => !img.complete)) await new Promise((r) => setTimeout(r, 200));
  });
}

async function open(page: Page, path: string) {
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
  await page.goto(path);
  await page.waitForLoadState('load');
  await settle(page);
  await page.waitForTimeout(1500);
}

const shot = { fullPage: true, animations: 'disabled' as const };

test('accueil (hors diaporama)', async ({ page }) => {
  await open(page, '/');
  await expect(page).toHaveScreenshot('accueil.png', { ...shot, mask: [page.locator('main section').first()] });
});

test('collections', async ({ page }) => {
  await open(page, '/collection');
  await expect(page).toHaveScreenshot('collection.png', shot);
});

test('collection filtrée (Coffrets)', async ({ page }) => {
  await open(page, legacy ? '/collection?category=Coffrets' : '/collection?category=coffrets');
  await expect(page).toHaveScreenshot('collection-coffrets.png', shot);
});

test('fiche produit (hors colonne d’informations)', async ({ page }, testInfo) => {
  await open(page, PRODUCT);
  if (testInfo.project.name === 'mobile') {
    // Mobile : la fiche affiche en plus l'accroche et les rubriques (ajout voulu) ; on compare
    // la galerie et la section « Résonances », qui doivent rester identiques.
    await expect(page.locator('.lg\\:hidden > div').first()).toHaveScreenshot('fiche-galerie.png', { animations: 'disabled' });
    await expect(page.locator('div.py-32', { hasText: 'Résonances' })).toHaveScreenshot('fiche-resonances.png', { animations: 'disabled' });
    return;
  }
  await expect(page).toHaveScreenshot('fiche.png', {
    ...shot,
    mask: [page.locator('[data-zone="infos-produit"], .lg\\:hidden > .px-6, .lg\\:flex > div:last-child')],
  });
});

test('journal', async ({ page }) => {
  await open(page, '/blog');
  await expect(page).toHaveScreenshot('journal.png', { ...shot, mask: [page.locator('img[alt*="jersey"]')] });
});

test('article', async ({ page }) => {
  await open(page, ARTICLE);
  await expect(page).toHaveScreenshot('article.png', { ...shot, mask: [page.locator('img[alt*="jersey"]')] });
});
