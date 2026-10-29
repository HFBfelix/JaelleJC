// Étape 4 : connexion par lien et par mot de passe, session serveur, fusion du panier, droit admin.
import { createHash } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { PASSWORD, createUser, newEmail, removeAdminClaim, resetCodesFor, signInLinkFor } from './auth-helpers';
import { FIXTURE, db } from './catalogue-fixture';

const SIGN_IN_ERROR = "Nous n'avons pas pu vous connecter. Vérifiez votre e-mail et réessayez.";
const NOT_ADMIN = "Ce compte n'a pas accès à l'espace créatrice.";

const noBanner = (page: Page) => page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
const main = (page: Page) => page.getByRole('main');
const accountIcon = (page: Page) => page.getByRole('link', { name: /^Mon compte/ });
const badge = (page: Page) => page.getByRole('button', { name: /^Ma sélection/ });

async function askLink(page: Page, email: string, path = '/connexion') {
  await page.goto(path);
  await main(page).getByLabel('Votre e-mail').fill(email);
  await main(page).getByRole('button', { name: 'Recevoir mon lien' }).click();
  await expect(main(page).getByRole('status')).toHaveText("Un lien vient de vous être envoyé. Il ne sert qu'une fois.");
}

async function signInWithPassword(page: Page, email: string, password: string, path = '/connexion') {
  await page.goto(path);
  await main(page).getByLabel('Votre e-mail').fill(email);
  await main(page).getByRole('button', { name: 'Utiliser un mot de passe' }).click();
  await main(page).getByLabel('Mot de passe').fill(password);
  await main(page).getByRole('button', { name: 'Se connecter' }).click();
}

test.beforeEach(async ({ page }) => { await noBanner(page); });

test('lien de connexion : compte créé au premier lien, session serveur, icône « connectée »', async ({ page, baseURL }) => {
  const email = newEmail();
  await askLink(page, email);
  await page.goto(await signInLinkFor(email, baseURL!));
  await expect(page).toHaveURL(/\/compte$/);
  await expect(main(page).getByText(email)).toBeVisible();
  await expect(accountIcon(page)).toHaveAccessibleName('Mon compte (connectée)');

  const session = (await page.context().cookies()).find((c) => c.name === '__session');
  expect(session).toMatchObject({ httpOnly: true, path: '/' });
  expect(await page.evaluate(() => document.cookie)).not.toContain('__session');
  // Rien n'est gardé par Firebase dans le navigateur (persistance en mémoire).
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('firebase:')))).toEqual([]);
});

test('lien déjà utilisé ou trafiqué : refusé, même message', async ({ page, browser, baseURL }) => {
  const email = newEmail();
  await askLink(page, email);
  const link = await signInLinkFor(email, baseURL!);
  await page.goto(link);
  await expect(page).toHaveURL(/\/compte$/);

  const other = await browser.newContext();
  const again = await other.newPage();
  await noBanner(again);
  await again.addInitScript((e) => localStorage.setItem('jaellejc-email-connexion', JSON.stringify({ email: e, at: Date.now() })), email);
  await again.goto(link);
  await expect(main(again).getByRole('alert')).toHaveText(SIGN_IN_ERROR);
  await again.goto(link.replace(/oobCode=[^&]+/, 'oobCode=faux-code'));
  await expect(main(again).getByRole('alert')).toHaveText(SIGN_IN_ERROR);
  await again.goto('/connexion/lien?retour=/compte');
  await expect(main(again).getByRole('alert')).toHaveText(SIGN_IN_ERROR);
  await expect(accountIcon(again)).toHaveAccessibleName('Mon compte');
  await other.close();
});

test('lien ouvert sur un autre appareil : e-mail redemandé, mauvaise adresse refusée', async ({ page, browser, baseURL }) => {
  const email = newEmail();
  await askLink(page, email);
  const link = await signInLinkFor(email, baseURL!);
  const other = await browser.newContext();
  const phone = await other.newPage();
  await noBanner(phone);
  await phone.goto(link);
  await main(phone).getByLabel('Votre e-mail').fill(newEmail());
  await main(phone).getByRole('button', { name: 'Se connecter' }).click();
  await expect(main(phone).getByRole('alert')).toHaveText(SIGN_IN_ERROR);
  await other.close();
});

test('mot de passe : bon, faux, compte inconnu (même message)', async ({ page }) => {
  const user = await createUser();
  await signInWithPassword(page, user.email, 'mauvais-mot-de-passe');
  await expect(main(page).getByRole('alert')).toHaveText(SIGN_IN_ERROR);
  await signInWithPassword(page, newEmail(), PASSWORD);
  await expect(main(page).getByRole('alert')).toHaveText(SIGN_IN_ERROR);
  await signInWithPassword(page, user.email, PASSWORD);
  await expect(page).toHaveURL(/\/compte$/);
});

test('mot de passe oublié : même réponse que le compte existe ou non', async ({ page }) => {
  const user = await createUser();
  const unknown = newEmail();
  for (const email of [user.email, unknown]) {
    await page.goto('/connexion');
    await main(page).getByLabel('Votre e-mail').fill(email);
    await main(page).getByRole('button', { name: 'Utiliser un mot de passe' }).click();
    await main(page).getByRole('button', { name: 'Mot de passe oublié ?' }).click();
    await expect(main(page).getByRole('status')).toHaveText(
      'Si un compte existe pour cette adresse, un e-mail pour choisir un nouveau mot de passe vient de vous être envoyé.');
  }
  expect(await resetCodesFor(user.email)).toBe(1);
  expect(await resetCodesFor(unknown)).toBe(0);
});

test('« Confirmer et payer » sans compte : e-mail d’abord, panier conservé et fusionné', async ({ page, context }) => {
  const user = await createUser();
  // Panier déjà présent sur le compte (autre appareil) : 1 cabas.
  await db().doc(`carts/u_${user.uid}`).set({
    tokenHash: null, userId: user.uid, items: [{ productId: FIXTURE.cabas.id, variantId: 'unique', quantity: 1 }],
    expiresAt: new Date(Date.now() + 86_400_000), updatedAt: new Date(),
  });

  await page.goto(`/produits/${FIXTURE.cabas.slug}`);
  await page.getByRole('button', { name: 'Ajouter à la sélection' }).click();
  const drawer = page.getByRole('dialog', { name: 'Votre sélection' });
  await expect(drawer.getByRole('status')).toHaveText('Ajouté à votre sélection');
  const guestToken = (await context.cookies()).find((c) => c.name === 'cart_token')!.value;
  await drawer.getByRole('link', { name: 'Confirmer et payer' }).click();
  await expect(page).toHaveURL(/\/connexion\?retour=\/panier$/);

  await main(page).getByLabel('Votre e-mail').fill(user.email);
  await main(page).getByRole('button', { name: 'Utiliser un mot de passe' }).click();
  await main(page).getByLabel('Mot de passe').fill(PASSWORD);
  await main(page).getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/panier$/);
  await expect(badge(page)).toHaveAccessibleName('Ma sélection (2)'); // 1 du compte + 1 du visiteur
  await expect(main(page).getByRole('button', { name: 'Confirmer et payer' })).toBeDisabled(); // paiement : étape 5

  // Le panier visiteur n'existe plus, son cookie non plus (un jeton imposé par un tiers n'ouvre plus rien).
  expect((await context.cookies()).find((c) => c.name === 'cart_token')).toBeUndefined();
  expect((await db().doc(`carts/${createHash('sha256').update(guestToken).digest('hex')}`).get()).exists).toBe(false);
});

test('panier du compte retrouvé sur un autre appareil', async ({ page, browser }) => {
  const user = await createUser();
  await signInWithPassword(page, user.email, user.password);
  await expect(page).toHaveURL(/\/compte$/);
  await page.goto(`/produits/${FIXTURE.cabas.slug}`);
  await page.getByRole('button', { name: 'Ajouter à la sélection' }).click();
  await expect(badge(page)).toHaveAccessibleName('Ma sélection (1)');

  const other = await browser.newContext();
  const laptop = await other.newPage();
  await noBanner(laptop);
  await signInWithPassword(laptop, user.email, user.password);
  await expect(laptop).toHaveURL(/\/compte$/);
  await expect(badge(laptop)).toHaveAccessibleName('Ma sélection (1)');
  await other.close();
});

test('déconnexion : session supprimée et révoquée (un cookie copié ne sert plus)', async ({ page, browser, baseURL }) => {
  const user = await createUser();
  await signInWithPassword(page, user.email, user.password);
  await expect(page).toHaveURL(/\/compte$/);
  const copied = (await page.context().cookies()).find((c) => c.name === '__session')!;
  // Firebase compare la révocation à la seconde : une session ouverte dans la même seconde que la déconnexion
  // resterait valable (limite connue, consignée dans reports/securite/etape-4.md). Une vraie visite dure plus.
  await page.waitForTimeout(1100);
  await main(page).getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(accountIcon(page)).toHaveAccessibleName('Mon compte');

  const thief = await browser.newContext();
  await thief.addCookies([{ name: '__session', value: copied.value, url: baseURL! }]);
  const stolen = await thief.newPage();
  await stolen.goto('/compte');
  await expect(stolen).toHaveURL(/\/connexion\?retour=\/compte$/);
  await thief.close();
});

test('mot de passe choisi depuis le compte : tous les appareils déconnectés, puis connexion avec ce mot de passe', async ({ page, browser, baseURL }) => {
  const email = newEmail();
  await askLink(page, email);
  await page.goto(await signInLinkFor(email, baseURL!));
  await expect(page).toHaveURL(/\/compte$/);
  // Second appareil déjà connecté (copie du cookie) : il doit perdre l'accès.
  const session = (await page.context().cookies()).find((c) => c.name === '__session')!;
  const other = await browser.newContext();
  await other.addCookies([{ name: '__session', value: session.value, url: baseURL! }]);
  const tablet = await other.newPage();
  await noBanner(tablet);
  await tablet.goto('/compte');
  await expect(tablet).toHaveURL(/\/compte$/);

  await page.waitForTimeout(1100); // révocation à la seconde près (voir le test de déconnexion)
  await main(page).getByLabel('Nouveau mot de passe').fill('court');
  await expect(main(page).getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  await main(page).getByLabel('Nouveau mot de passe').fill('Nouveau-mdp-2026');
  await main(page).getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page).toHaveURL(/\/connexion\?retour=\/compte&info=mot-de-passe$/);
  await expect(main(page).getByRole('status')).toContainText('Votre mot de passe est enregistré.');

  await tablet.goto('/compte');
  await expect(tablet).toHaveURL(/\/connexion\?retour=\/compte$/);
  await other.close();

  await main(page).getByLabel('Votre e-mail').fill(email);
  await main(page).getByRole('button', { name: 'Utiliser un mot de passe' }).click();
  await main(page).getByLabel('Mot de passe').fill('Nouveau-mdp-2026');
  await main(page).getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/compte$/);
});

test('compte à adresse non vérifiée (créé sans le lien) : aucune session, même message', async ({ page }) => {
  const user = await createUser({ emailVerified: false });
  await signInWithPassword(page, user.email, user.password);
  await expect(main(page).getByRole('alert')).toHaveText(SIGN_IN_ERROR);
  await expect(accountIcon(page)).toHaveAccessibleName('Mon compte');
});

test.describe('pages protégées', () => {
  test('anonyme : compte et espace créatrice redirigés vers la connexion', async ({ page }) => {
    await page.goto('/compte');
    await expect(page).toHaveURL(/\/connexion\?retour=\/compte$/);
    await page.goto('/createur');
    await expect(page).toHaveURL(/\/createur\/connexion$/);
    await expect(main(page).getByLabel('Votre e-mail')).toBeVisible();
  });

  test('cookie de session inventé : anonyme', async ({ browser, baseURL }) => {
    const context = await browser.newContext();
    // Jeton non signé qui se prétend administrateur, fabriqué ici (aucune valeur figée dans le dépôt).
    const part = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const forged = `${part({ alg: 'none' })}.${part({ admin: true, email_verified: true })}.`;
    await context.addCookies([{ name: '__session', value: forged, url: baseURL! }]);
    const page = await context.newPage();
    await page.goto('/createur');
    await expect(page).toHaveURL(/\/createur\/connexion$/);
    await page.goto('/compte');
    await expect(page).toHaveURL(/\/connexion/);
    await context.close();
  });

  test('cliente (non admin) : refusée à l’espace créatrice, message clair', async ({ page }) => {
    const user = await createUser();
    await signInWithPassword(page, user.email, user.password, '/createur/connexion');
    await expect(main(page).getByText(NOT_ADMIN)).toBeVisible();
    await page.goto('/createur');
    await expect(page).toHaveURL(/\/createur\/connexion$/);
    await expect(main(page).getByText(NOT_ADMIN)).toBeVisible();
  });

  test('administratrice (revendication admin) : accès à l’espace créatrice', async ({ page }) => {
    const admin = await createUser({ admin: true });
    await signInWithPassword(page, admin.email, admin.password, '/createur/connexion');
    await expect(page).toHaveURL(/\/createur$/);
    await expect(main(page).getByRole('heading', { level: 1, name: 'Espace créatrice' })).toBeVisible();
    await expect(main(page).getByText('Vous êtes connectée.')).toBeVisible();

    // Droit retiré sans révocation (console) : refus immédiat, le cookie ne suffit plus.
    await removeAdminClaim(admin.uid);
    await page.goto('/createur');
    await expect(page).toHaveURL(/\/createur\/connexion$/);
  });

  test('retour après connexion vers un autre site : ignoré', async ({ page }) => {
    const user = await createUser();
    await signInWithPassword(page, user.email, user.password, '/connexion?retour=https://evil.example');
    await expect(page).toHaveURL(/\/compte$/);
  });
});
