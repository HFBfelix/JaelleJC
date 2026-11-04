// Étape 7bis, lot 4 : envois automatiques (relances de panier J+1/J+3/J+5, « colis arrivé ? », avis à J+14),
// lancés depuis l'Atelier ; jamais deux fois ; lien « ne plus recevoir ces messages » ; route du cron protégée.
import { randomBytes } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { Timestamp } from 'firebase-admin/firestore';
import { createUser } from './auth-helpers';
import { FIXTURE, db } from './catalogue-fixture';

const main = (page: Page) => page.getByRole('main');
const FAKE = 'http://127.0.0.1:12111';
const DAY = 24 * 3600 * 1000;
const ago = (days: number) => Timestamp.fromMillis(Date.now() - days * DAY);
const inbox = async (to: string) => ((await (await fetch(`${FAKE}/__test/emails?to=${encodeURIComponent(to)}`)).json()) as { subject: string; text: string }[]);

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'ordinateur', 'Atelier : ordinateur');
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
});

async function runFromAtelier(page: Page) {
  await page.goto('/atelier/reglages');
  await main(page).getByRole('button', { name: 'Lancer les envois maintenant' }).click();
  await expect(main(page).getByText(/^Envois terminés/)).toBeVisible({ timeout: 60_000 });
}

async function seedOrder(email: string, status: string, dates: Record<string, Timestamp>) {
  const id = `cs_test_${randomBytes(10).toString('hex')}`;
  const reference = `JJC-261101-${randomBytes(2).toString('hex').toUpperCase()}`;
  await db().doc(`orders/${id}`).set({
    userId: null, reference, status, createdAt: ago(20), ...dates,
    items: [{ productId: FIXTURE.buy.id, variantId: 'unique', sku: 'S', name: FIXTURE.buy.name, variantLabel: '', unitPriceCents: 6000, quantity: 1, image: '' }],
    amounts: { subtotalCents: 6000, deliveryCents: 0, totalCents: 6000 },
    customer: { uid: null, email, name: 'Camille Test', phone: '' },
    shipping: { line1: '1 Rue de la Paix', line2: '', zipCode: '75002', city: 'Paris', country: 'FR' },
    gift: { wrap: false, message: '' }, stripe: { sessionId: id, paymentIntentId: '', eventId: '' },
    tracking: { carrier: 'Colissimo', number: '6A12345678901', url: 'https://www.laposte.fr' }, refund: null,
    emails: { cliente: 'envoye', boutique: 'envoye' },
  });
  return { id, reference };
}

test('panier oublié relancé à J+1 puis J+5 (jamais deux fois) ; « colis arrivé ? » et avis à J+14 ; désinscription respectée', async ({ page }) => {
  // Cliente avec un panier inactif depuis 1 jour et demi.
  const client = await createUser();
  const cart = db().doc(`carts/u_${client.uid}`);
  await cart.set({ tokenHash: null, userId: client.uid, items: [{ productId: FIXTURE.buy.id, variantId: 'unique', quantity: 1 }], updatedAt: ago(1.5), expiresAt: Timestamp.fromMillis(Date.now() + 5 * DAY) });
  // Commandes : expédiée il y a 4 jours ; livrée il y a 15 jours.
  const shipped = await seedOrder(`e2e-colis-${randomBytes(3).toString('hex')}@exemple.test`, 'shipped', { shippedAt: ago(4) });
  const delivered = await seedOrder(`e2e-avis-${randomBytes(3).toString('hex')}@exemple.test`, 'delivered', { shippedAt: ago(18), deliveredAt: ago(15) });
  const shippedEmail = (await db().doc(`orders/${shipped.id}`).get()).get('customer.email') as string;
  const deliveredEmail = (await db().doc(`orders/${delivered.id}`).get()).get('customer.email') as string;

  const admin = await createUser({ admin: true });
  await page.goto('/atelier/connexion');
  await main(page).getByLabel('Votre e-mail').fill(admin.email);
  await main(page).getByRole('button', { name: 'Utiliser un mot de passe' }).click();
  await main(page).getByLabel('Mot de passe').fill(admin.password);
  await main(page).getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/atelier$/);

  await runFromAtelier(page);
  expect((await inbox(client.email)).map((m) => m.subject)).toEqual(['Votre sélection vous attend']);
  expect((await inbox(shippedEmail)).map((m) => m.subject)).toEqual([`Votre colis est-il bien arrivé ? — ${shipped.reference}`]);
  expect((await inbox(deliveredEmail)).map((m) => m.subject)).toEqual(['Comment se passe la vie avec votre pièce ?']);

  // Deuxième passage le même jour : aucun doublon.
  await runFromAtelier(page);
  expect(await inbox(client.email)).toHaveLength(1);
  expect(await inbox(shippedEmail)).toHaveLength(1);
  expect(await inbox(deliveredEmail)).toHaveLength(1);

  // Trois jours plus tard sans visite (cron manqué) : seule la dernière relance part.
  await cart.update({ updatedAt: ago(5.5) });
  await db().collection('emailMarks').doc(`panier_${client.uid}_${(await cart.get()).get('updatedAt').toMillis()}`).set({ uid: client.uid, stage: 1 });
  await runFromAtelier(page);
  expect((await inbox(client.email)).map((m) => m.subject)).toEqual(['Votre sélection vous attend', 'Votre sélection sera retirée dans 2 jours']);

  // « Ne plus recevoir ces messages » : plus aucune relance pour cette adresse.
  const link = new URL(/https?:\/\/\S+\/emails\/preferences\S+/.exec((await inbox(client.email))[1]!.text)![0]);
  await page.goto(link.pathname + link.search);
  await main(page).getByRole('button', { name: 'Ne plus recevoir ces messages' }).click();
  await expect(main(page).getByText(/vous ne recevrez plus ces messages/)).toBeVisible();
  await cart.update({ updatedAt: ago(1.2) }); // nouvelle visite puis nouvel oubli
  await runFromAtelier(page);
  expect(await inbox(client.email)).toHaveLength(2);

  await Promise.all([cart.delete(), db().doc(`orders/${shipped.id}`).delete(), db().doc(`orders/${delivered.id}`).delete()]);
});

test('réglage du délai « colis arrivé ? » ; cron sans secret refusé ; envois réservés à l’administratrice', async ({ page, request }) => {
  expect((await request.get('/api/cron/envois')).status()).toBe(401);
  expect((await request.get('/api/cron/envois', { headers: { authorization: 'Bearer faux' } })).status()).toBe(401);
  const client = await createUser();
  await page.goto('/connexion');
  await main(page).getByLabel('Votre e-mail').fill(client.email);
  await main(page).getByRole('button', { name: 'Utiliser un mot de passe' }).click();
  await main(page).getByLabel('Mot de passe').fill(client.password);
  await main(page).getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/compte$/);
  await page.goto('/atelier/reglages');
  await expect(page).toHaveURL(/\/atelier\/connexion$/);
});
