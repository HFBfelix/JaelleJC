// Étape 7c : tableau de bord « À faire », catégories, réglages de livraison (journalisés), messages et export CSV.
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test, expect, type Page } from '@playwright/test';
import { Timestamp } from 'firebase-admin/firestore';
import { createUser } from './auth-helpers';
import { DELIVERY, db } from './catalogue-fixture';

const main = (page: Page) => page.getByRole('main');

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'ordinateur', 'espace créatrice : ordinateur');
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
  const admin = await createUser({ admin: true });
  await page.goto('/createur/connexion');
  await main(page).getByLabel('Votre e-mail').fill(admin.email);
  await main(page).getByRole('button', { name: 'Utiliser un mot de passe' }).click();
  await main(page).getByLabel('Mot de passe').fill(admin.password);
  await main(page).getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/createur$/);
});

test('tableau de bord : un message non lu apparaît dans « À faire », puis disparaît une fois lu ; export CSV neutralisé', async ({ page }) => {
  const id = `e2e-message-${randomBytes(4).toString('hex')}`;
  await db().doc(`contacts/${id}`).set({
    name: 'Camille E2E', email: 'camille@exemple.test', subject: 'Question', message: '=HYPERLINK("http://x") bonjour',
    status: 'unread', createdAt: Timestamp.now(),
  });
  await page.reload();
  const unread = main(page).getByRole('link', { name: /message\(s\) non lu\(s\)/ });
  const before = Number((await unread.textContent())!.match(/\d+/)![0]);
  expect(before).toBeGreaterThanOrEqual(1);

  await page.goto('/createur/messages');
  const card = main(page).getByRole('listitem').filter({ hasText: 'Camille E2E' });
  await expect(card.getByText(/=HYPERLINK/)).toBeVisible(); // texte brut, jamais interprété
  const [download] = await Promise.all([page.waitForEvent('download'), main(page).getByRole('button', { name: 'Exporter les messages' }).click()]);
  const csv = await readFile((await download.path())!, 'utf8');
  expect(csv).toContain(`"'=HYPERLINK(""http://x"") bonjour"`);

  await card.getByRole('button', { name: 'Marquer comme lu' }).click();
  await expect.poll(async () => (await db().doc(`contacts/${id}`).get()).get('status')).toBe('read');
  await page.goto('/createur');
  await expect(main(page).getByRole('link', { name: /message\(s\) non lu\(s\)/ })).toContainText(String(before - 1));
  await db().doc(`contacts/${id}`).delete();
});

test('réglages : frais de livraison enregistrés en centimes et journalisés', async ({ page }) => {
  const ref = db().doc('settings/delivery');
  await page.goto('/createur/reglages');
  const form = main(page).getByRole('form', { name: 'Livraison' });
  await form.getByLabel('Frais de livraison (€)').fill('7,90');
  await form.getByRole('button', { name: 'Enregistrer la livraison' }).click();
  await expect(form.getByText('Enregistré.')).toBeVisible();
  expect((await ref.get()).get('flatRateCents')).toBe(790);
  const audit = await db().collection('auditLog').where('action', '==', 'reglages.livraison').get();
  expect(audit.size).toBeGreaterThanOrEqual(1);
  await ref.set(DELIVERY); // réglage du jeu de données rétabli
  await Promise.all(audit.docs.map((d) => d.ref.delete()));
});

test('catégories : nouvel univers avec une famille ; adresse figée', async ({ page }) => {
  const name = `E2E univers ${randomBytes(3).toString('hex')}`;
  await page.goto('/createur/categories');
  const form = main(page).getByRole('form', { name: 'Nouvelle catégorie' });
  await form.getByLabel('Nom').fill(name);
  await form.getByRole('button', { name: 'Ajouter une famille' }).click();
  await form.getByLabel('Famille 1').fill('Capes de bain');
  await form.getByRole('button', { name: 'Créer l’univers' }).click();
  await expect(main(page).getByRole('form', { name: `Catégorie ${name}` })).toBeVisible();
  const slug = name.toLowerCase().replace(/ /g, '-');
  expect((await db().doc(`categories/${slug}`).get()).data()).toMatchObject({ name, subs: [{ slug: 'capes-de-bain', name: 'Capes de bain' }] });
  await db().doc(`categories/${slug}`).delete();
  for (const a of (await db().collection('auditLog').where('target', '==', slug).get()).docs) await a.ref.delete();
});
