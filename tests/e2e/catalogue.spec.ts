// Étape 2 : catalogue rendu côté serveur, redirections, SEO, et ce que le public ne doit jamais voir.
import { test, expect } from '@playwright/test';
import { FIXTURE } from './catalogue-fixture';

const jsonLd = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]!));

test('fiche : contenu, prix et données structurées dans le HTML initial (sans JavaScript)', async ({ request }) => {
  const res = await request.get(`/produits/${FIXTURE.published.slug}`);
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain(`<title>${FIXTURE.published.name} | Jaelle &amp; JC</title>`);
  expect(html).toContain(`<link rel="canonical" href="https://www.jaellejc.com/produits/${FIXTURE.published.slug}"/>`);
  expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  expect(html).toMatch(/89(<!-- -->)? €/); // React peut séparer le nombre et le symbole par un commentaire
  expect(html).toContain('Cape : 80 × 80 cm');
  expect(html).toContain('Laver à 30°');
  expect(html).not.toContain('Matières nobles sélectionnées'); // plus de texte de remplissage
  const data = jsonLd(html);
  const product = data.find((d) => d['@type'] === 'Product');
  expect(product.offers).toMatchObject({ price: '89.00', priceCurrency: 'EUR', availability: 'https://schema.org/InStock' });
  expect(data.find((d) => d['@type'] === 'BreadcrumbList').itemListElement).toHaveLength(4);
});

test('fiche épuisée : indisponible (une variante inactive ne compte pas)', async ({ page, request }) => {
  const html = await (await request.get(`/produits/${FIXTURE.soldOut.slug}`)).text();
  expect(jsonLd(html).find((d) => d['@type'] === 'Product').offers.availability).toBe('https://schema.org/OutOfStock');
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
  await page.goto(`/produits/${FIXTURE.soldOut.slug}`);
  await expect(page.getByRole('button', { name: 'Épuisé' }).first()).toBeDisabled();
});

for (const [label, item] of [['brouillon', FIXTURE.draft], ['archive', FIXTURE.archived], ['prix invalide', FIXTURE.invalid]] as const) {
  test(`${label} : introuvable pour le public, partout`, async ({ request }) => {
    expect((await request.get(`/produits/${item.slug}`)).status()).toBe(404);
    expect((await request.get(`/product/${item.id}`, { maxRedirects: 0 })).status()).toBe(404);
    for (const path of ['/', '/collection', '/sitemap.xml', `/collection?category=${FIXTURE.category.slug}`]) {
      expect(await (await request.get(path)).text()).not.toContain(item.slug);
    }
  });
}

test('anciennes adresses : redirection 301', async ({ request }) => {
  const product = await request.get(`/product/${FIXTURE.published.id}`, { maxRedirects: 0 });
  expect(product.status()).toBe(301);
  expect(product.headers().location).toContain(`/produits/${FIXTURE.published.slug}`);
  const article = await request.get('/blog/1', { maxRedirects: 0 });
  expect(article.status()).toBe(301);
  expect(article.headers().location).toContain('/blog/pour-l-amour-du-vichy');
  const category = await request.get('/collection?category=Naissance%20E2E', { maxRedirects: 0 });
  expect([301, 308]).toContain(category.status());
  expect(category.headers().location).toContain(`category=${FIXTURE.category.slug}`);
});

test('identifiant d’ancienne adresse malformé : 404 sans erreur', async ({ request }) => {
  expect((await request.get('/product/..%2F..%2Fsettings', { maxRedirects: 0 })).status()).toBe(404);
  expect((await request.get(`/product/${'x'.repeat(300)}`, { maxRedirects: 0 })).status()).toBe(404);
});

test('accueil et collection : produits publiés dans le HTML initial', async ({ request }) => {
  for (const path of ['/', '/collection', `/collection?category=${FIXTURE.category.slug}`]) {
    const html = await (await request.get(path)).text();
    expect(html).toContain(`/produits/${FIXTURE.published.slug}`);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  }
});

test('texte piégé (HTML, script) : affiché comme du texte, jamais exécuté', async ({ page, request }) => {
  const html = await (await request.get(`/produits/${FIXTURE.html.slug}`)).text();
  expect(html).not.toContain('<script>window.__pirate');
  expect(html).not.toContain('<img src=x');
  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    expect(block[1]).not.toMatch(/<\/?script|<img/i);
  }
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
  page.on('dialog', () => { throw new Error('boîte de dialogue inattendue'); });
  await page.goto(`/produits/${FIXTURE.html.slug}`);
  await page.waitForLoadState('load');
  expect(await page.evaluate(() => (window as unknown as { __pirate?: number }).__pirate)).toBeUndefined();
  await expect(page.getByText('</script><script>window.__pirate = 1</script>').first()).toBeAttached();
});

test('plan du site et robots', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain(`/produits/${FIXTURE.published.slug}`);
  expect(sitemap).toContain('/blog/pour-l-amour-du-vichy');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /'); // hors production : rien n'est indexé
});

test('journal : article avec données structurées, adresse inconnue en 404', async ({ request }) => {
  const html = await (await request.get('/blog/pour-l-amour-du-vichy')).text();
  expect(jsonLd(html).some((d) => d['@type'] === 'Article')).toBe(true);
  expect((await request.get('/blog/inconnu')).status()).toBe(404);
});

test('page inconnue : 404', async ({ request }) => {
  expect((await request.get('/nimporte-quoi')).status()).toBe(404);
});

test('aucun champ interne dans le HTML envoyé (stock exact, dates, champs de migration)', async ({ request }) => {
  for (const path of [`/produits/${FIXTURE.published.slug}`, '/', '/collection']) {
    const html = await (await request.get(path)).text();
    for (const leak of ['"stock":', '\\"stock\\":', 'updatedAt', 'createdAtMs', 'legacy', 'aiDraft']) {
      expect(html, `${path} contient ${leak}`).not.toContain(leak);
    }
  }
});

test('adresse de fiche anormale (très longue, majuscules, script) : 404, jamais 500', async ({ request }) => {
  for (const slug of ['a'.repeat(3000), 'Cape-E2E', '%3Cscript%3E', 'a--b']) {
    expect((await request.get(`/produits/${slug}`)).status()).toBe(404);
  }
});

test('une seule fiche pour toutes les tailles : pastilles de couleur, tailles dans l’ordre de la grille, épuisé barré', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none')); // bandeau des cookies fermé
  await page.goto(`/produits/${FIXTURE.sizes.slug}`);
  const colors = page.getByRole('group', { name: 'Couleur' });
  const sizes = page.getByRole('group', { name: 'Taille' });
  // Bloc d'achat présent deux fois dans la page (mobile, ordinateur) : un seul visible une fois les styles chargés.
  await expect(colors).toHaveCount(1);
  // Pastille de la teinte choisie par la créatrice ; couleur sans aucun stock barrée.
  await expect(colors.getByRole('button', { name: 'Écru' })).toHaveCSS('background-color', 'rgb(243, 234, 216)');
  await expect(colors.getByRole('button', { name: 'Bleu (épuisé)' })).toBeDisabled();
  if (!test.info().project.use.isMobile) {
    await colors.locator('[title="Épuisé"]').hover();
    await expect(colors.getByText('Épuisé', { exact: true })).toBeVisible();
  }
  // Première variante en stock choisie d'office : Écru, 3M ; 6M épuisé en écru. Ordre de la grille : 3M avant 6M.
  await expect(colors).toContainText('Couleur : Écru');
  await expect(colors.getByRole('button', { name: 'Écru' })).toHaveAttribute('aria-pressed', 'true');
  await expect(sizes.getByRole('button')).toHaveText(['3M', '6M']);
  await expect(sizes.getByRole('button', { name: '3M' })).toHaveAttribute('aria-pressed', 'true');
  // Taille épuisée : barrée, « Épuisé » au survol (souris seulement).
  await expect(sizes.getByRole('button', { name: '6M (épuisé)' })).toBeDisabled();
  if (!test.info().project.use.isMobile) {
    await sizes.locator('[title="Épuisé"]').hover();
    await expect(sizes.getByText('Épuisé', { exact: true })).toBeVisible();
  }
  await expect(sizes.getByRole('button', { name: '6M' })).toBeDisabled();
  // Rose : le 3M est épuisé, la taille passe d'elle-même au 6M.
  await colors.getByRole('button', { name: 'Rose' }).click();
  await expect(colors).toContainText('Couleur : Rose');
  await expect(sizes.getByRole('button', { name: '3M' })).toBeDisabled();
  await expect(sizes.getByRole('button', { name: '6M' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Ajouter à la sélection' }).click();
  const drawer = page.getByRole('dialog', { name: 'Votre sélection' });
  await expect(drawer.getByRole('status')).toHaveText('Ajouté à votre sélection');
  await expect(drawer.getByText('Rose · 6M')).toBeVisible();
});

test('pièce sans taille ni coloris : aucun choix, ajout direct', async ({ page }) => {
  await page.goto(`/produits/${FIXTURE.published.slug}`);
  await expect(page.getByRole('group', { name: 'Taille' })).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Couleur' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ajouter à la sélection' })).toBeEnabled();
});
