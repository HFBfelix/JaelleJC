// Modèle (2026-11-04) : une fiche par couleur, reliées dans l'Atelier (« Même modèle que… ») ; alertes rouges pour une
// fiche à plusieurs couleurs ou une fiche de modèle sans couleur ; Atelier réservé à l'administratrice.
import { test, expect, type Page } from '@playwright/test';
import { createUser } from './auth-helpers';
import { FIXTURE, db } from './catalogue-fixture';

const main = (page: Page) => page.getByRole('main');

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'ordinateur', 'Atelier : ordinateur');
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
});

async function signIn(page: Page, user: { email: string; password: string }, path: string) {
  await page.goto(path);
  await main(page).getByLabel('Votre e-mail').fill(user.email);
  await main(page).getByRole('button', { name: 'Utiliser un mot de passe' }).click();
  await main(page).getByLabel('Mot de passe').fill(user.password);
  await main(page).getByRole('button', { name: 'Se connecter' }).click();
}

test('relier une fiche au modèle puis l’en retirer ; alertes rouges de couleur', async ({ page }) => {
  const admin = await createUser({ admin: true });
  await signIn(page, admin, '/atelier/connexion');
  await expect(page).toHaveURL(/\/atelier$/);

  // Fiche d'un modèle : l'autre couleur est listée.
  await page.goto(`/atelier/produits/${FIXTURE.modelNoir.id}`);
  const model = main(page).getByRole('region', { name: 'Modèle' });
  await expect(model.getByRole('link', { name: FIXTURE.modelBleu.name })).toBeVisible();
  await expect(model).toContainText('Bleu · en ligne');

  // Ancienne fiche à plusieurs couleurs : signalée en rouge, rien de changé.
  await page.goto(`/atelier/produits/${FIXTURE.sizes.id}`);
  await expect(main(page).getByRole('region', { name: 'Modèle' })).toContainText('Plusieurs couleurs sur cette fiche');

  // Fiche sans couleur reliée au modèle : listée avec les autres, alerte « indiquez sa couleur », pas de pastille publique.
  await page.goto(`/atelier/produits/${FIXTURE.html.id}`);
  const region = main(page).getByRole('region', { name: 'Modèle' });
  await region.getByRole('combobox', { name: 'Même modèle que…' }).selectOption({ label: FIXTURE.modelNoir.name });
  await region.getByRole('button', { name: 'Relier' }).click();
  await expect(region.getByText('Fiche reliée au modèle.')).toBeVisible();
  await expect(region.getByRole('link', { name: FIXTURE.modelBleu.name })).toBeVisible();
  await expect(region).toContainText('indiquez sa couleur');
  expect((await db().doc(`produits/${FIXTURE.html.id}`).get()).get('modelId')).toBe(FIXTURE.modelNoir.id);

  await region.getByRole('button', { name: 'Retirer cette fiche du modèle' }).click();
  await expect(region.getByText('Fiche retirée du modèle.')).toBeVisible();
  expect((await db().doc(`produits/${FIXTURE.html.id}`).get()).get('modelId')).toBeNull();
});

test('cliente ordinaire : pas d’accès à la fiche de l’Atelier', async ({ page }) => {
  const client = await createUser();
  await signIn(page, client, '/connexion');
  await expect(page).toHaveURL(/\/compte$/);
  await page.goto(`/atelier/produits/${FIXTURE.modelNoir.id}`);
  await expect(page).toHaveURL(/\/atelier\/connexion$/);
});
