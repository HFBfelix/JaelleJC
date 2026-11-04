// Parcours d'achat (décisions de Jaelle, 2026-11-04) : création de compte visible à la connexion ; coordonnées
// (civilité, prénom, nom, téléphone français) obligatoires avant le paiement ; livraison en France métropolitaine
// seulement ; refus du serveur si les coordonnées manquent, même si l'écran est contourné ; cadeau livré à une
// autre personne : destinataire et acheteur séparés.
import { test, expect, type Page } from '@playwright/test';
import { createUser, newEmail, signInLinkFor } from './auth-helpers';
import { FIXTURE, db } from './catalogue-fixture';

const FAKE = 'http://127.0.0.1:12111';
const METROPOLE = 'Nous livrons en France métropolitaine uniquement (Corse comprise).';
const main = (page: Page) => page.getByRole('main');
const sessions = async () => ((await (await fetch(`${FAKE}/__test/count`)).json()) as { sessions: number }).sessions;

test.beforeEach(async ({ page }, info) => {
  test.skip(!['ordinateur', 'mobile'].includes(info.project.name), 'parcours de paiement : Chromium');
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
});

async function addToCart(page: Page) {
  await page.goto(`/produits/${FIXTURE.buy.slug}`);
  await page.getByRole('button', { name: 'Ajouter à la sélection' }).click();
  await expect(page.getByRole('dialog', { name: 'Votre sélection' }).getByRole('status')).toHaveText('Ajouté à votre sélection');
}

async function signInWithPassword(page: Page, user: { email: string; password: string }) {
  await page.goto('/connexion');
  await main(page).getByLabel('Votre e-mail').fill(user.email);
  await main(page).getByRole('button', { name: 'Utiliser un mot de passe' }).click();
  await main(page).getByLabel('Mot de passe').fill(user.password);
  await main(page).getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/compte$/);
}

test('nouveau compte : « Créer mon compte », lien, coordonnées exigées avant le paiement, puis livraison', async ({ page, baseURL }) => {
  await addToCart(page);
  await page.goto('/connexion?retour=/panier');
  const email = newEmail();
  await main(page).getByLabel('Votre e-mail').fill(email);
  await expect(main(page).getByRole('region', { name: 'Vous avez déjà un compte' })).toBeVisible();
  const creation = main(page).getByRole('region', { name: 'Vous êtes nouveau ou nouvelle ici ?' });
  await creation.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(main(page).getByText(/Un lien de confirmation vient de vous être envoyé/)).toBeVisible();

  await page.goto(await signInLinkFor(email, baseURL!, '/panier'));
  await expect(page).toHaveURL(/\/panier$/);
  const coords = main(page).getByRole('region', { name: 'Vos coordonnées' });
  await expect(coords).toBeVisible();
  await expect(coords.getByText(email)).toBeVisible();
  await expect(main(page).getByRole('button', { name: 'Confirmer et payer' })).toBeDisabled();

  await coords.getByLabel('Civilité').selectOption({ label: 'Monsieur' });
  await coords.getByLabel('Prénom').fill('Louis');
  await coords.getByLabel('Nom', { exact: true }).fill('Martin');
  await coords.getByLabel('Téléphone').fill('6 11 22 33 44');
  await coords.getByRole('button', { name: 'Enregistrer' }).click();

  const delivery = main(page).getByRole('group', { name: 'Livraison' });
  await expect(delivery.getByText(METROPOLE).first()).toBeVisible();
  await expect(delivery.getByLabel('À moi-même (Louis Martin)')).toBeChecked();
  await expect(delivery.getByText(/Au nom de Louis Martin/)).toBeVisible();

  // Outre-mer : refusé dès la saisie, bouton inactif.
  await delivery.getByLabel('Code postal').fill('97200');
  await expect(delivery.getByRole('alert')).toHaveText(METROPOLE);
  await expect(main(page).getByRole('button', { name: 'Confirmer et payer' })).toBeDisabled();
});

test('coordonnées retirées après l’affichage de la page : le serveur refuse le paiement, aucune session Stripe', async ({ page }) => {
  const user = await createUser();
  await signInWithPassword(page, user);
  await addToCart(page);
  await page.goto('/panier');
  const delivery = main(page).getByRole('group', { name: 'Livraison' });
  await delivery.getByLabel('Adresse', { exact: true }).fill('1 rue de la Paix');
  await delivery.getByLabel('Code postal').fill('75002');
  await delivery.getByLabel('Ville').fill('Paris');

  await db().doc(`users/${user.uid}`).update({ telephone: '' }); // profil devenu incomplet entre-temps
  const before = await sessions();
  await main(page).getByRole('button', { name: 'Confirmer et payer' }).click();
  await expect(main(page).getByRole('region', { name: 'Vos coordonnées' })).toBeVisible();
  expect(await sessions()).toBe(before);
});

test('cadeau livré à une autre personne (Corse) : destinataire et acheteur séparés', async ({ page }) => {
  const user = await createUser();
  await signInWithPassword(page, user);
  await addToCart(page);
  await page.goto('/panier');
  const delivery = main(page).getByRole('group', { name: 'Livraison' });
  await delivery.getByLabel('Cadeau livré à une autre personne').check();
  await delivery.getByLabel('Prénom du destinataire').fill('Lou');
  await delivery.getByLabel('Nom du destinataire', { exact: true }).fill('Bernard');
  await delivery.getByLabel('Téléphone du destinataire').fill('7 00 00 00 02');
  await delivery.getByLabel('Adresse', { exact: true }).fill('5 cours Napoléon');
  await delivery.getByLabel('Code postal').fill('20000'); // Corse : métropole
  await delivery.getByLabel('Ville').fill('Ajaccio');
  await main(page).getByRole('button', { name: 'Confirmer et payer' }).click();
  await page.waitForURL(/\/pay\/cs_test_/);
  const id = page.url().split('/pay/')[1]!;
  const snapshot = (await db().doc(`checkouts/${id}`).get()).data()!;
  expect(snapshot.shipping).toMatchObject({ name: 'Lou Bernard', phone: '+33700000002', zipCode: '20000' });
  expect(snapshot.buyer).toEqual({ name: 'Camille Test', phone: '+33600000000' });
});
