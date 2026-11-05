// Atelier, onglet Clientes (2026-11-05) : recherche d'un compte, fiche, suppression en deux étapes (« Êtes-vous sûre ? »
// puis le mot SUPPRIMER). Commandes gardées et détachées. Anonyme et cliente refusées ; compte d'administratrice protégé.
import { randomBytes } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { Timestamp } from 'firebase-admin/firestore';
import { createUser, userExists } from './auth-helpers';
import { db } from './catalogue-fixture';

const main = (page: Page) => page.getByRole('main');

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'ordinateur', 'Atelier : ordinateur');
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
});

async function signIn(page: Page, admin: boolean) {
  const user = await createUser({ admin });
  await page.goto(admin ? '/atelier/connexion' : '/connexion');
  await main(page).getByLabel('Votre e-mail').fill(user.email);
  await main(page).getByRole('button', { name: 'Utiliser un mot de passe' }).click();
  await main(page).getByLabel('Mot de passe').fill(user.password);
  await main(page).getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(admin ? /\/atelier$/ : /\/compte$/);
  return user;
}

test('anonyme et cliente ordinaire : ni la liste ni la fiche des clientes', async ({ page }) => {
  const other = await createUser();
  for (const path of ['/atelier/clientes', `/atelier/clientes/${other.uid}`]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/atelier\/connexion$/);
  }
  await signIn(page, false);
  for (const path of ['/atelier/clientes', `/atelier/clientes/${other.uid}`]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/atelier\/connexion$/);
  }
  // Lien de reconnexion de l'Atelier : sans effet pour une non-administratrice (même page de refus).
  await page.goto('/atelier/connexion?info=reconnexion');
  await expect(main(page).getByText('Par sécurité, reconnectez-vous pour confirmer cette action.')).toHaveCount(0);
  await expect(main(page).getByRole('button', { name: 'Se déconnecter' })).toBeVisible();
  expect(await userExists(other.uid)).toBe(true);
});

test('administratrice : son propre compte ne se supprime pas depuis « Mes données »', async ({ page }) => {
  const admin = await signIn(page, true);
  await page.goto('/compte/donnees');
  await main(page).getByRole('button', { name: 'Supprimer mon compte' }).click();
  await main(page).getByRole('dialog', { name: 'Supprimer mon compte' }).getByRole('button', { name: 'OK' }).click();
  await expect(main(page).getByText('Ce compte donne accès à l’Atelier : il ne peut pas être supprimé d’ici.')).toBeVisible();
  expect(await userExists(admin.uid)).toBe(true);
});

test('reconnexion demandée : formulaire affiché à l’administratrice déjà connectée, puis retour à l’Atelier', async ({ page }) => {
  const admin = await signIn(page, true);
  await page.goto('/atelier/connexion');
  await expect(page).toHaveURL(/\/atelier$/); // sans demande : retour direct
  await page.goto('/atelier/connexion?info=reconnexion');
  await expect(main(page).getByText('Par sécurité, reconnectez-vous pour confirmer cette action.')).toBeVisible();
  await main(page).getByLabel('Votre e-mail').fill(admin.email);
  await main(page).getByRole('button', { name: 'Utiliser un mot de passe' }).click();
  await main(page).getByLabel('Mot de passe').fill(admin.password);
  await main(page).getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/atelier$/);
});

test('recherche, fiche, suppression en deux étapes ; commandes gardées sans lien ; administratrice protégée', async ({ page }) => {
  const client = await createUser();
  const orderId = `cs_test_${randomBytes(8).toString('hex')}`;
  await db().doc(`orders/${orderId}`).set({
    userId: client.uid, reference: `JJC-261105-${randomBytes(2).toString('hex').toUpperCase()}`, status: 'delivered', createdAt: Timestamp.now(),
    items: [{ productId: 'p', variantId: 'v', sku: 'S', name: 'Cape E2E', variantLabel: '', unitPriceCents: 8900, quantity: 1, image: '' }],
    amounts: { subtotalCents: 8900, deliveryCents: 0, totalCents: 8900 },
    customer: { uid: client.uid, email: client.email, name: 'Camille Test', phone: '' },
    shipping: { line1: '1 rue de la Paix', line2: '', zipCode: '75002', city: 'Paris', country: 'FR' },
    gift: { wrap: false, message: '' }, tracking: null, refund: null,
  });
  const admin = await signIn(page, true);

  await page.getByRole('navigation', { name: 'Atelier' }).getByRole('link', { name: 'Clientes' }).click();
  await main(page).getByLabel('Rechercher (e-mail ou nom)').fill(client.email.toUpperCase());
  await main(page).getByRole('button', { name: 'Rechercher' }).click();
  const list = main(page).getByRole('list', { name: 'Comptes' });
  await expect(list.getByRole('link')).toHaveCount(1);
  await list.getByRole('link', { name: new RegExp(client.email) }).click();
  await expect(page).toHaveURL(new RegExp(`/atelier/clientes/${client.uid}$`));
  await expect(main(page)).toContainText('Commandes (1)');

  // Étape 1 : « Êtes-vous sûre ? » ; Annuler ne supprime rien.
  await main(page).getByRole('button', { name: 'Supprimer le compte' }).click();
  const sure = main(page).getByRole('dialog', { name: 'Supprimer le compte' });
  await expect(sure).toContainText('La suppression est définitive');
  await sure.getByRole('button', { name: 'Annuler' }).click();
  await expect(sure).toBeHidden();
  expect(await userExists(client.uid)).toBe(true);

  // Étape 2 : le bouton final ne s'active qu'avec SUPPRIMER exactement.
  await main(page).getByRole('button', { name: 'Supprimer le compte' }).click();
  await sure.getByRole('button', { name: 'Oui, continuer' }).click();
  const final = main(page).getByRole('dialog', { name: 'Confirmer la suppression' });
  const confirm = final.getByRole('button', { name: 'Supprimer définitivement' });
  await expect(confirm).toBeDisabled();
  await final.getByLabel('Tapez SUPPRIMER pour confirmer').fill('supprimer');
  await expect(confirm).toBeDisabled();
  await final.getByLabel('Tapez SUPPRIMER pour confirmer').fill('SUPPRIMER');
  await confirm.click();

  await expect(page).toHaveURL(/\/atelier\/clientes\?supprime=1$/);
  await expect(main(page).getByText('Le compte a été supprimé.', { exact: false })).toBeVisible();
  expect(await userExists(client.uid)).toBe(false);
  expect((await db().doc(`users/${client.uid}`).get()).exists).toBe(false);
  expect((await db().doc(`orders/${orderId}`).get()).data()).toMatchObject({ userId: null, customer: { uid: null } });
  const audit = await db().collection('auditLog').where('target', '==', client.uid).get();
  expect(audit.docs.map((d) => [d.get('action'), d.get('who')])).toEqual([['cliente.supprimee', admin.uid]]);
  expect(JSON.stringify(audit.docs.map((d) => d.data()))).not.toContain(client.email);

  // Compte d'administratrice : pas de bouton de suppression.
  await page.goto(`/atelier/clientes/${admin.uid}`);
  await expect(main(page).getByText('Compte d’administratrice : il ne se supprime pas depuis l’Atelier.')).toBeVisible();
  await expect(main(page).getByRole('button', { name: 'Supprimer le compte' })).toHaveCount(0);
  await Promise.all([...audit.docs.map((d) => d.ref.delete()), db().doc(`orders/${orderId}`).delete()]);
});
