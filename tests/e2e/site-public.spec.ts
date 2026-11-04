// Inscription à la newsletter (pied de page) et recherche de la collection (accents, univers, plusieurs mots).
import { randomBytes } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { FIXTURE, db } from './catalogue-fixture';

const main = (page: Page) => page.getByRole('main');
const FAKE = 'http://127.0.0.1:12111';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
});

test('newsletter : inscription enregistrée par le serveur, une seule fois par adresse ; e-mail de confirmation, liste Brevo, désinscription', async ({ page }) => {
  // Adresse IP propre au test (limite de 5 inscriptions par adresse IP et par heure).
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': `198.51.100.${randomBytes(1)[0]! % 250 + 1}` });
  for (const d of (await db().collection('rateLimits').get()).docs) if (d.id.startsWith('newsletter-ip_')) await d.ref.delete();
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

  // Une seule confirmation (deuxième envoi : déjà inscrite), adresse ajoutée à la liste Brevo de la lettre.
  const inbox = async () => (await (await fetch(`${FAKE}/__test/emails?to=${encodeURIComponent(email)}`)).json()) as { subject: string; text: string }[];
  const contacts = async () => (await (await fetch(`${FAKE}/__test/contacts`)).json()) as { email: string; listIds: number[] }[];
  await expect.poll(async () => (await inbox()).length).toBe(1);
  const [mail] = await inbox();
  expect(mail!.subject).toBe('Bienvenue dans la lettre Jaelle & JC');
  await expect.poll(contacts).toContainEqual({ email, listIds: [7] });

  // Lien de l'e-mail : désinscription en un clic, inscription effacée, adresse retirée de la liste.
  const link = new URL(/https?:\/\/\S+desinscription\S+/.exec(mail!.text)![0]);
  await page.goto(link.pathname + link.search);
  await page.getByRole('button', { name: 'Me désinscrire' }).click();
  await expect(page.getByText('Votre adresse ne recevra plus la lettre Jaelle & JC.')).toBeVisible();
  expect((await db().collection('newsletter').where('email', '==', email).get()).size).toBe(0);
  expect((await contacts()).map((c) => c.email)).not.toContain(email);
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

test('recherche par usage : une phrase sans mot du catalogue → pièces choisies par l’IA (faux Mistral), sinon message', async ({ page }) => {
  // Compteurs de la limite remis à zéro (les parcours répétés viennent tous de la même adresse locale).
  for (const d of (await db().collection('rateLimits').get()).docs) if (d.id.startsWith('recherche-')) await d.ref.delete();
  const results = (q: string) => page.goto(`/collection?search=${encodeURIComponent(q)}`);
  await results('cadeau pour le baptême de mon neveu');
  await expect(main(page).getByText(FIXTURE.buy.name, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  await expect(main(page).getByText(FIXTURE.cabas.name, { exact: true })).toHaveCount(0);

  await results('je pars en vacances');
  await expect(main(page).getByText(FIXTURE.cabas.name, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  await expect(main(page).getByText(FIXTURE.buy.name, { exact: true })).toHaveCount(0);

  // Rien ne convient : message, aucune pièce.
  await results('une phrase sans rapport aucun');
  await expect(main(page).getByText('Aucune pièce ne correspond à cette recherche.')).toBeVisible({ timeout: 15_000 });

  // La phrase de la cliente ne part qu'avec les faits publics des pièces en ligne (jamais un brouillon).
  const ai = JSON.stringify(await (await fetch('http://127.0.0.1:12111/__test/ai')).json());
  expect(ai).toContain('baptême de mon neveu');
  expect(ai).not.toContain('Brouillon E2E secret');
});
