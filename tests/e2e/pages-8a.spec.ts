// Étape 8a : pages de l'ancien site portées (Notre promesse, Contact, newsletter, pages légales). Mêmes adresses que
// l'ancien site ; une seule H1, adresse canonique ; typographie « Atelier » (ni italique ni texte sous 11 px) ;
// contact et newsletter écrits par le serveur.
import { randomBytes } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { db } from './catalogue-fixture';

const main = (page: Page) => page.getByRole('main');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
});

const PAGES: [string, string][] = [
  ['/notre-promesse', 'Une histoire de mains et de naissances.'],
  ['/contact', 'L’Atelier vous écoute'],
  ['/newsletter', 'Le Fil de l’Atelier'],
  ['/mentions-legales', 'Mentions légales'],
  ['/confidentialite', 'Politique de confidentialité'],
  ['/livraison-et-retours', 'Expédition, retours et remboursements'],
  ['/CGV', 'Conditions générales de vente et d’utilisation'],
];

for (const [path, h1] of PAGES) {
  test(`${path} : page servie, une seule H1, canonique, ni italique ni texte sous 11 px`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(main(page).getByRole('heading', { level: 1 })).toHaveText(h1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path.replace('/', '\\/')}$`));
    const offenders = await main(page).evaluate((root) => [...root.querySelectorAll<HTMLElement>('*')]
      .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
      .filter((el) => { const s = getComputedStyle(el); return s.fontStyle === 'italic' || parseFloat(s.fontSize) < 11; })
      .map((el) => el.textContent!.trim().slice(0, 40)));
    expect(offenders).toEqual([]);
  });
}

test('menu et pied de page : Notre promesse, Contact, Mentions et CGV mènent à leur page', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  for (const [name, path] of [['Contact', '/contact'], ['Mentions', '/mentions-legales'], ['CGV', '/CGV']] as const) {
    await expect(footer.getByRole('link', { name, exact: true })).toHaveAttribute('href', path);
  }
  const sitemap = await (await page.request.get('/sitemap.xml')).text();
  for (const [path] of PAGES) expect(sitemap).toContain(`${path}</loc>`);
});

test('contact : message enregistré par le serveur dans les messages de l’Atelier ; champ piège ignoré', async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': `198.51.100.${randomBytes(1)[0]! % 250 + 1}` });
  for (const d of (await db().collection('rateLimits').get()).docs) if (d.id.startsWith('contact-ip_')) await d.ref.delete();
  const email = `e2e-contact-${randomBytes(4).toString('hex')}@exemple.test`;
  await page.goto('/contact', { waitUntil: 'networkidle' }); // formulaire interactif avant la saisie (WebKit)
  const form = main(page).getByRole('form', { name: 'Écrire à l’atelier' });
  await form.getByLabel('Votre nom').fill('Camille Test');
  await form.getByLabel('Votre e-mail').fill(email);
  await form.getByLabel('Votre message').fill('Bonjour, une question sur la cape de bain.');
  await form.getByRole('button', { name: 'Envoyer ma demande' }).click();
  await expect(main(page).getByRole('status')).toContainText('Message envoyé');
  const docs = await db().collection('contacts').where('email', '==', email).get();
  expect(docs.docs.map((d) => d.data())).toEqual([expect.objectContaining({ name: 'Camille Test', status: 'unread', message: 'Bonjour, une question sur la cape de bain.' })]);
  await Promise.all(docs.docs.map((d) => d.ref.delete()));
});

test('newsletter : demande en attente enregistrée avec la source de la page ; ?email= ignoré (jamais d’adresse reprise de l’URL)', async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': `198.51.100.${randomBytes(1)[0]! % 250 + 1}` });
  for (const d of (await db().collection('rateLimits').get()).docs) if (d.id.startsWith('newsletter-ip_')) await d.ref.delete();
  const email = `e2e-lettre-${randomBytes(4).toString('hex')}@exemple.test`;
  await page.goto(`/newsletter?email=${encodeURIComponent(email)}`, { waitUntil: 'networkidle' });
  await expect(main(page).getByLabel('Votre adresse e-mail')).toHaveValue('');
  await main(page).getByLabel('Votre adresse e-mail').fill(email);
  await main(page).getByRole('button', { name: 'Confirmer l’inscription' }).click();
  await expect(main(page).getByRole('status')).toContainText('Un e-mail vous attend pour confirmer votre inscription.');
  const docs = await db().collection('newsletter').where('email', '==', email).get();
  expect(docs.docs[0]!.data()).toMatchObject({ source: 'page_newsletter', status: 'en_attente' });
  await Promise.all(docs.docs.map((d) => d.ref.delete()));
});

test('livraison et retours : seuil, forfait et délai lus dans les réglages de l’Atelier', async ({ page }) => {
  const settings = (await db().doc('settings/delivery').get()).data() as { freeThresholdCents: number; flatRateCents: number; estimatedDays: string };
  const euros = (c: number) => (c % 100 === 0 ? String(c / 100) : (c / 100).toFixed(2).replace('.', ','));
  await page.goto('/livraison-et-retours');
  if (settings.freeThresholdCents > 0) await expect(main(page)).toContainText(`Livraison offerte à partir de ${euros(settings.freeThresholdCents)} € d’achat.`);
  if (settings.estimatedDays) await expect(main(page)).toContainText(`Délai de livraison estimé : ${settings.estimatedDays}.`);
  await expect(main(page)).toContainText('Nous livrons en France métropolitaine uniquement (Corse comprise).');
  await expect(main(page)).not.toContainText('40 €');
});
