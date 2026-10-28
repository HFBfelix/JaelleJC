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
