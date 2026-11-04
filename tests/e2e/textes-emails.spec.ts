// Étape 7bis, lot 5 : textes des e-mails réglés dans l'Atelier (Réglages) et paragraphe personnalisé par Mistral
// (faux Mistral local) ; mot inconnu refusé ; retour au texte d'origine.
import { test, expect, type Page } from '@playwright/test';
import { Timestamp } from 'firebase-admin/firestore';
import { createUser } from './auth-helpers';
import { FIXTURE, db } from './catalogue-fixture';

const main = (page: Page) => page.getByRole('main');
const FAKE = 'http://127.0.0.1:12111';
const DAY = 24 * 3600 * 1000;
const inbox = async (to: string) => ((await (await fetch(`${FAKE}/__test/emails?to=${encodeURIComponent(to)}`)).json()) as { subject: string; text: string; html?: string }[]);

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'ordinateur', 'Atelier : ordinateur');
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
});

test('texte de la relance modifié dans l’Atelier, paragraphe de l’IA ajouté ; mot inconnu refusé ; texte d’origine rétabli', async ({ page }) => {
  const client = await createUser();
  // Profil posé comme par « Faisons connaissance » : la relance salue « Madame Martin ».
  await db().doc(`users/${client.uid}`).set({ civilite: 'madame', prenom: 'Camille', nom: 'Martin' }, { merge: true });
  const cart = db().doc(`carts/u_${client.uid}`);
  await cart.set({ tokenHash: null, userId: client.uid, items: [{ productId: FIXTURE.buy.id, variantId: 'unique', quantity: 1 }],
    updatedAt: Timestamp.fromMillis(Date.now() - 1.5 * DAY), expiresAt: Timestamp.fromMillis(Date.now() + 5 * DAY) });

  const admin = await createUser({ admin: true });
  await page.goto('/atelier/connexion');
  await main(page).getByLabel('Votre e-mail').fill(admin.email);
  await main(page).getByRole('button', { name: 'Utiliser un mot de passe' }).click();
  await main(page).getByLabel('Mot de passe').fill(admin.password);
  await main(page).getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/atelier$/);

  await page.goto('/atelier/reglages');
  await main(page).getByRole('combobox', { name: 'E-mail', exact: true }).selectOption({ label: 'Relance du panier — 1 jour' });
  await expect(main(page).getByLabel('Objet')).toHaveValue('Votre sélection vous attend');
  await expect(main(page).getByLabel(/Ajouter un court paragraphe rédigé par Mistral/)).toBeChecked();

  // Mot entre accolades inconnu : refusé.
  await main(page).getByRole('textbox', { name: /^Texte/ }).fill('Bonjour {prénom}, vos pièces vous attendent.');
  await main(page).getByRole('button', { name: 'Enregistrer', exact: true }).last().click();
  await expect(main(page).getByText('Mot entre accolades inconnu : {prénom}.')).toBeVisible();

  await main(page).getByLabel('Objet').fill('Vos pièces vous attendent à l’atelier');
  await main(page).getByRole('textbox', { name: /^Texte/ }).fill('Vos pièces vous attendent.\n\nÀ très vite.');
  await main(page).getByRole('button', { name: 'Enregistrer', exact: true }).last().click();
  await expect(main(page).getByText('Enregistré. Les prochains e-mails partiront avec ce texte.')).toBeVisible();
  await expect(main(page).getByRole('option', { name: 'Relance du panier — 1 jour — modifié' })).toBeAttached();

  await main(page).getByRole('button', { name: 'Lancer les envois maintenant' }).click();
  await expect(main(page).getByText(/^Envois terminés/)).toBeVisible({ timeout: 60_000 });
  const [mail] = await inbox(client.email);
  expect(mail!.subject).toBe('Vos pièces vous attendent à l’atelier');
  expect(mail!.text).toContain('Bonjour Madame Martin,\nVos pièces vous attendent.\nÀ très vite.');
  expect(mail!.text).toContain(`Paragraphe de l’IA sur ${FIXTURE.buy.name}.`);

  // Seuls des faits du catalogue partent chez Mistral : ni l'adresse de la cliente ni son identifiant.
  const ai = JSON.stringify(await (await fetch(`${FAKE}/__test/ai`)).json());
  expect(ai).not.toContain(client.email);
  expect(ai).not.toContain(client.uid);

  // Retour au texte d'origine.
  await main(page).getByRole('button', { name: 'Revenir au texte d’origine' }).click();
  await expect(main(page).getByText('Texte d’origine rétabli.')).toBeVisible();
  await expect(main(page).getByLabel('Objet')).toHaveValue('Votre sélection vous attend');
  expect(((await db().doc('settings/emailTexts').get()).get('relance1'))).toBeUndefined();

  await cart.delete();
});
