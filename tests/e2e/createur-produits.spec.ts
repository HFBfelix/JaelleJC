// Espace créatrice, produits. Accès réservé à l'administratrice ; fiche sur une seule page : photos et description
// libre (tapée ou dictée), analyse IA (faux serveur Mistral) qui préremplit sans rien enregistrer, ce qui manque en
// rouge, enregistrement, mise en ligne ; stock protégé contre l'écrasement d'une vente ; archivage.
import { randomBytes } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { createUser } from './auth-helpers';
import { FIXTURE, db } from './catalogue-fixture';
import { FAKE_STRIPE_PORT } from './fake-stripe';

const FAKE = `http://127.0.0.1:${FAKE_STRIPE_PORT}`;
// Photo PNG de 1 × 1 pixel : réduite et convertie en JPEG par le navigateur avant l'envoi.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
// En-tête d'un enregistrement webm (le faux serveur ne lit pas l'audio).
const WEBM = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01]);
const main = (page: Page) => page.getByRole('main');
const panel = (page: Page) => main(page).getByRole('complementary', { name: 'Publication' });
const E2E_PRODUCT_PREFIX = 'E2E créatrice'; // nettoyé par catalogue-fixture.ts

// Micro simulé par Chromium (dictée), sans fenêtre d'autorisation.
test.use({ permissions: ['microphone'], launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] } });

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'ordinateur', 'espace créatrice : surtout sur ordinateur');
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'none'));
});

async function signInAdmin(page: Page) {
  const admin = await createUser({ admin: true });
  await page.goto('/atelier/connexion');
  await main(page).getByLabel('Votre e-mail').fill(admin.email);
  await main(page).getByRole('button', { name: 'Utiliser un mot de passe' }).click();
  await main(page).getByLabel('Mot de passe').fill(admin.password);
  await main(page).getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/atelier$/);
  return admin;
}

async function newProduct(page: Page) {
  const name = `${E2E_PRODUCT_PREFIX} cape ${randomBytes(3).toString('hex')}`;
  await page.goto('/atelier/produits');
  await main(page).getByRole('textbox', { name: 'Nouvelle pièce' }).fill(name);
  await main(page).getByRole('button', { name: 'Créer la fiche' }).click();
  await expect(page).toHaveURL(/\/atelier\/produits\/[A-Za-z0-9]+$/);
  return { name, id: page.url().split('/').pop()! };
}

const save = async (page: Page) => {
  await panel(page).getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(panel(page).getByText('Enregistré.')).toBeVisible();
};

test('anonyme et cliente ordinaire : l’espace créatrice, l’aperçu, les photos et la dictée sont refusés', async ({ page }) => {
  for (const path of ['/atelier/produits', '/atelier/produits/e2e-publie', '/atelier/apercu/e2e-brouillon']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/atelier\/connexion$/);
  }
  const origin = new URL(page.url()).origin;
  const audio = { audio: { name: 'dictee.webm', mimeType: 'audio/webm', buffer: WEBM } };
  expect((await page.request.post('/api/createur/dictee', { multipart: audio, headers: { origin } })).status()).toBe(401);

  const user = await createUser();
  await page.goto('/atelier/connexion');
  await main(page).getByLabel('Votre e-mail').fill(user.email);
  await main(page).getByRole('button', { name: 'Utiliser un mot de passe' }).click();
  await main(page).getByLabel('Mot de passe').fill(user.password);
  await main(page).getByRole('button', { name: 'Se connecter' }).click();
  for (const path of ['/atelier/produits', '/atelier/apercu/e2e-brouillon']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/atelier\/connexion$/);
  }
  // Envoi de photo et dictée : cliente connectée refusée, autre site refusé, sans rien écrire ni rien envoyer à l'IA.
  const before = (await db().doc('produits/e2e-publie').get()).get('images');
  const multipart = { productId: 'e2e-publie', photo: { name: 'x.png', mimeType: 'image/png', buffer: PNG } };
  expect((await page.request.post('/api/createur/photos', { multipart, headers: { origin } })).status()).toBe(401);
  expect((await page.request.post('/api/createur/photos', { multipart, headers: { origin: 'https://evil.example' } })).status()).toBe(403);
  expect((await db().doc('produits/e2e-publie').get()).get('images')).toEqual(before);
  expect((await page.request.post('/api/createur/dictee', { multipart: audio, headers: { origin } })).status()).toBe(401);
  expect((await page.request.post('/api/createur/dictee', { multipart: audio, headers: { origin: 'https://evil.example' } })).status()).toBe(403);
});

test('dictée : un fichier qui n’est pas un enregistrement est refusé', async ({ page }) => {
  await signInAdmin(page);
  const origin = new URL(page.url()).origin;
  const res = await page.request.post('/api/createur/dictee', { multipart: { audio: { name: 'x.webm', mimeType: 'audio/webm', buffer: PNG } }, headers: { origin } });
  expect(res.status()).toBe(400);
  expect(await res.json()).toEqual({ status: 'type' });
});

test('fiche : photo, dictée, analyse IA qui préremplit sans enregistrer, vérification, mise en ligne, archivage', async ({ page }) => {
  test.setTimeout(120_000); // parcours complet : plus long quand toute la suite tourne en parallèle
  await signInAdmin(page);
  const { id } = await newProduct(page);

  // Fiche vide : ce qui manque est en rouge, la mise en ligne est bloquée.
  await expect(panel(page).getByText('Un prix (à compléter)')).toBeVisible();
  await expect(main(page).getByLabel(/Prix TTC/)).toHaveAttribute('aria-invalid', 'true');
  await expect(panel(page).getByRole('button', { name: 'Mettre en ligne' })).toBeDisabled();

  // 1. Photo réduite dans le navigateur, rangée sous produits/<id>/ avec un nom aléatoire.
  await main(page).locator('input[type=file]').setInputFiles({ name: 'IMG_0001.png', mimeType: 'image/png', buffer: PNG });
  await expect(main(page).getByLabel(/Texte alternatif de la photo 1/)).toBeVisible();
  await expect(main(page).getByLabel(/Texte alternatif de la photo 1/)).toHaveAttribute('aria-invalid', 'true');
  const images = (await db().doc(`produits/${id}`).get()).get('images');
  expect(images[0].path).toMatch(new RegExp(`^produits/${id}/[0-9a-f-]{36}\\.jpg$`)); // jamais « IMG_0001 »

  // 2. Dictée (micro simulé) : le texte transcrit s'ajoute à la description libre.
  const notes = main(page).getByLabel(/Description libre/);
  await notes.fill('Cape en gaze de coton.');
  await main(page).getByRole('button', { name: 'Dicter' }).click();
  await expect(main(page).getByText(/Enregistrement 0:/)).toBeVisible();
  await page.waitForTimeout(1200);
  await main(page).getByRole('button', { name: 'Arrêter la dictée' }).click();
  await expect(notes).toHaveValue('Cape en gaze de coton.\nCape de bain en gaze de coton, trois pièces en écru.');

  // 3. Envoi à l'IA : tout se préremplit, rien n'est encore enregistré dans la fiche.
  await main(page).getByRole('button', { name: 'Envoyer à l’IA' }).click();
  await expect(panel(page).getByText(/Fiche préremplie par l’IA/)).toBeVisible();
  await expect(main(page).getByLabel(/Nom de la pièce/)).toHaveValue('E2E créatrice cape de bain en gaze');
  await expect(main(page).getByLabel(/Prix TTC/)).toHaveValue('45,50');
  await expect(main(page).getByLabel(/^Univers/)).toHaveValue(FIXTURE.createurCategory.slug);
  await expect(main(page).getByLabel(/^Famille/)).toHaveValue('capes');
  await expect(main(page).getByLabel(/Cas d’usage/)).toHaveValue('naissance\nbaptême');
  await expect(main(page).getByLabel(/Texte alternatif de la photo 1/)).toHaveValue('Cape de bain écrue pliée');
  await expect(main(page).getByLabel('Stock écru')).toHaveValue('3');
  // Une fiche, une couleur (2026-11-04) : la seconde couleur proposée n'est pas ajoutée, elle est signalée.
  await expect(main(page).getByLabel('Stock rose')).toHaveCount(0);
  await expect(main(page).getByText('Une fiche par couleur : « rose » à créer dans une autre fiche, reliée au même modèle')).toBeVisible();
  await expect(main(page).getByText('Stock du coloris rose non indiqué')).toBeVisible();
  await expect(main(page).getByText('proposé par l’IA · à vérifier').first()).toBeVisible();
  const stored = (await db().doc(`produits/${id}`).get()).data()!;
  expect(stored.priceCents).toBe(0);
  expect(stored.aiDraft.reviewed).toBe(false);
  expect((await db().doc(`produitsNotes/${id}`).get()).get('notes')).toContain('trois pièces en écru');

  // Ce qui part chez l'IA : les notes et les photos, aucune donnée de compte.
  const sent = JSON.stringify(await (await fetch(`${FAKE}/__test/ai`)).json());
  expect(sent).toContain('trois pièces en écru');
  expect(sent).toContain('image_url');
  expect(sent).not.toContain('@exemple.test');

  // Publication bloquée tant que les propositions de l'IA ne sont pas vérifiées.
  await expect(panel(page).getByText('Le brouillon IA relu (à compléter)')).toBeVisible();
  await expect(panel(page).getByRole('button', { name: /mettre en ligne/i })).toBeDisabled();

  // 4. Enregistrer : fiche, photos et variantes en une fois.
  await save(page);
  const saved = (await db().doc(`produits/${id}`).get()).data()!;
  expect(saved).toMatchObject({ priceCents: 4550, categoryId: FIXTURE.createurCategory.slug, subCategory: 'capes', usages: ['naissance', 'baptême'] });
  expect(saved.images[0].alt).toBe('Cape de bain écrue pliée');
  await expect.poll(async () => (await db().doc(`produits/${id}/variantes/ecru`).get()).get('stock')).toBe(3);
  expect((await db().doc(`produits/${id}/variantes/unique`).get()).get('active')).toBe(false);

  // 5. Vérification, puis mise en ligne.
  await panel(page).getByLabel('J’ai vérifié les propositions de l’IA').check();
  await expect.poll(async () => (await db().doc(`produits/${id}`).get()).get('aiDraft.reviewed')).toBe(true);
  await panel(page).getByRole('button', { name: 'Mettre en ligne' }).click();
  await expect(panel(page).getByText('La pièce est en ligne.')).toBeVisible();

  const doc = (await db().doc(`produits/${id}`).get()).data()!;
  expect(doc).toMatchObject({ status: 'published', inStock: true });
  const res = await page.goto(`/produits/${doc.slug}`);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'E2E créatrice cape de bain en gaze' })).toBeAttached();
  const audit = await db().collection('auditLog').where('target', '==', id).get();
  expect(audit.docs.map((d) => d.get('action'))).toEqual(expect.arrayContaining(['produit.cree', 'produit.analyse-ia', 'stock.modifie', 'produit.publie']));

  // Pièce en ligne : impossible de l'enregistrer incomplète ; le champ vidé passe en rouge.
  await page.goto(`/atelier/produits/${id}`);
  await main(page).getByLabel(/Accroche/).fill('');
  await expect(main(page).getByLabel(/Accroche/)).toHaveAttribute('aria-invalid', 'true');
  await panel(page).getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(panel(page).getByText(/Une pièce en ligne doit rester complète/)).toBeVisible();

  // Archivage : retirée du site.
  await page.reload();
  await panel(page).getByRole('button', { name: 'Archiver' }).click();
  await expect.poll(async () => (await db().doc(`produits/${id}`).get()).get('status')).toBe('archived');
  expect((await page.goto(`/produits/${doc.slug}`))?.status()).toBe(404);
});

test('stock : une vente pendant la saisie n’est jamais écrasée', async ({ page }) => {
  await signInAdmin(page);
  const { id } = await newProduct(page);
  await db().doc(`produits/${id}/variantes/unique`).update({ stock: 7 }); // modifié ailleurs (vente, autre onglet)
  await main(page).getByLabel('Stock unique').fill('2');
  await panel(page).getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(panel(page).getByText(/Une vente a modifié le stock/)).toBeVisible();
  expect((await db().doc(`produits/${id}/variantes/unique`).get()).get('stock')).toBe(7);
  await expect(main(page).getByLabel('Stock unique')).toHaveValue('7'); // variantes rechargées depuis la base
});

test('variantes : tailles cochées dans une grille, une teinte par coloris, enregistrées en base', async ({ page }) => {
  await signInAdmin(page);
  const { id } = await newProduct(page);
  const section = main(page).getByRole('region', { name: 'Variantes et stock' });
  await section.getByLabel('Ajouter des coloris').fill('Bleu nuit');
  await section.getByLabel('Grille de tailles').selectOption('bebe');
  await section.getByRole('group', { name: 'Tailles à ajouter' }).getByLabel('6M', { exact: true }).check();
  await section.getByRole('group', { name: 'Tailles à ajouter' }).getByLabel('3M', { exact: true }).check();
  await section.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await section.getByLabel('Teinte Bleu nuit').fill('#1f3a5f');
  await section.getByLabel('Stock Bleu nuit 3M').fill('2');
  await panel(page).getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(panel(page).getByText('Enregistré.')).toBeVisible();
  const variants = (await db().collection(`produits/${id}/variantes`).where('color', '==', 'Bleu nuit').get()).docs.map((d) => d.data());
  expect(variants.map((v) => v.size).sort()).toEqual(['3M', '6M']);
  expect(variants.every((v) => v.colorHex === '#1f3a5f')).toBe(true);
});

test('variantes : retirer une ligne ajoutée par erreur, retirer une couleur (désactivée, jamais effacée), la rétablir', async ({ page }) => {
  await signInAdmin(page);
  const { id } = await newProduct(page);
  const section = main(page).getByRole('region', { name: 'Variantes et stock' });
  const variant = (vid: string) => db().doc(`produits/${id}/variantes/${vid}`).get();
  await section.getByLabel('Ajouter des coloris').fill('Rose');
  await section.getByLabel('Grille de tailles').selectOption('bebe');
  await section.getByRole('group', { name: 'Tailles à ajouter' }).getByLabel('3M', { exact: true }).check();
  await section.getByRole('group', { name: 'Tailles à ajouter' }).getByLabel('6M', { exact: true }).check();
  await section.getByRole('button', { name: 'Ajouter', exact: true }).click();

  // Ligne pas encore enregistrée : enlevée tout de suite, rien en base.
  await section.getByRole('button', { name: 'Retirer Rose 6M' }).click();
  await expect(section.getByLabel('Stock Rose 6M')).toHaveCount(0);
  await section.getByLabel('Stock Rose 3M').fill('2');
  await save(page);
  expect((await variant('rose-3m')).get('active')).toBe(true);
  expect((await variant('rose-6m')).exists).toBe(false);

  // Couleur enregistrée avec du stock : confirmation, puis désactivée en base (jamais effacée) et rangée à part.
  page.once('dialog', (d) => { expect(d.message()).toBe('La couleur Rose a encore 2 pièces en stock : la retirer quand même ?'); void d.accept(); });
  await section.getByRole('button', { name: 'Retirer la couleur Rose' }).click();
  await expect(section.getByLabel('Stock Rose 3M')).toHaveCount(0);
  await expect(section.getByLabel('Teinte Rose')).toHaveCount(0);
  await save(page);
  expect((await variant('rose-3m')).data()).toMatchObject({ active: false, color: 'Rose', size: '3M' });
  await page.reload();
  await section.getByRole('button', { name: 'Afficher les variantes retirées (1)' }).click();

  // Rétablie : de nouveau dans le tableau et active en base.
  await section.getByRole('button', { name: 'Rétablir Rose 3M' }).click();
  await expect(section.getByLabel('Stock Rose 3M')).toHaveValue('2');
  await save(page);
  expect((await variant('rose-3m')).get('active')).toBe(true);
});

test('référence (SKU) : enregistrée en capitales, unique dans la boutique', async ({ page }) => {
  await signInAdmin(page);
  const sku = `E2E-${randomBytes(3).toString('hex').toUpperCase()}`;
  const first = await newProduct(page);
  await main(page).getByLabel('Référence (SKU)').fill(sku.toLowerCase());
  await save(page);
  expect((await db().doc(`produits/${first.id}`).get()).get('sku')).toBe(sku);
  const second = await newProduct(page);
  await main(page).getByLabel('Référence (SKU)').fill(sku);
  await panel(page).getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(panel(page).getByText('Cette référence (SKU) est déjà utilisée par une autre pièce.')).toBeVisible();
  expect((await db().doc(`produits/${second.id}`).get()).get('sku') ?? null).toBeNull();
});

test('aperçu privé d’un brouillon ; le brouillon reste introuvable pour le public', async ({ page }) => {
  await signInAdmin(page);
  const { id } = await newProduct(page);
  await main(page).getByLabel(/Prix TTC/).fill('30');
  await save(page);
  const slug = (await db().doc(`produits/${id}`).get()).get('slug');

  await page.goto(`/atelier/apercu/${id}`);
  await expect(page.getByText(/Aperçu privé — pièce non publiée/)).toBeVisible();
  await expect(page.getByText('Aperçu : l’ajout à la sélection est désactivé.').first()).toBeAttached();
  expect((await page.goto(`/produits/${slug}`))?.status()).toBe(404);

  // Brouillon jamais publié : supprimable, avec son texte libre.
  await db().doc(`produitsNotes/${id}`).set({ notes: 'Cape' });
  await page.goto(`/atelier/produits/${id}`);
  page.once('dialog', (d) => d.accept());
  await panel(page).getByRole('button', { name: 'Supprimer le brouillon' }).click();
  await expect(page).toHaveURL(/\/atelier\/produits$/);
  expect((await db().doc(`produits/${id}`).get()).exists).toBe(false);
  expect((await db().doc(`produitsNotes/${id}`).get()).exists).toBe(false);
});

test('export Excel et catalogue PDF : réservés à l’administratrice', async ({ page, request }) => {
  expect((await request.get('/api/createur/export-produits')).status()).toBe(401);
  const anonymous = await request.post('/api/createur/catalogue', { data: { ids: ['x'], showPrices: true, intro: '', texts: {} } });
  expect([401, 403]).toContain(anonymous.status());
  await page.goto('/atelier/produits/catalogue');
  await expect(page).toHaveURL(/\/atelier\/connexion$/);
});

test('export Excel : tableur de tous les produits ; catalogue : pièces en stock cochées, textes de l’IA relus, PDF téléchargé', async ({ page }) => {
  await signInAdmin(page);
  await page.goto('/atelier/produits');
  const [csv] = await Promise.all([page.waitForEvent('download'), main(page).getByRole('link', { name: 'Exporter (Excel)' }).click()]);
  expect(csv.suggestedFilename()).toMatch(/^produits-jaellejc-\d{4}-\d{2}-\d{2}\.csv$/);
  const sheet = await (await import('node:fs/promises')).readFile((await csv.path())!, 'utf8');
  // CSV pour Excel : UTF-8 avec BOM, point-virgule, une ligne par variante, décimales à virgule.
  expect(sheet.startsWith('﻿Nom;Référence (SKU);Univers;Famille;Statut;Prix (€);Couleur;Taille;')).toBe(true);
  expect(sheet).toContain(`"${FIXTURE.sizes.name}";"";"Paiement E2E";"Capes";"En ligne";"52,00";"Rose";"6M"`);

  // Pièce en stock avec trois photos (servies par le faux serveur) : mise en page à trois photos du PDF.
  const withPhotos = `${E2E_PRODUCT_PREFIX} catalogue ${randomBytes(3).toString('hex')}`;
  const photoRef = db().collection('produits').doc();
  await photoRef.set({
    slug: `catalogue-${photoRef.id.toLowerCase()}`, name: withPhotos, status: 'draft', categoryId: FIXTURE.createurCategory.slug, subCategory: 'capes',
    accroche: 'Cabas en toile imprimée.', histoire: '', description: '', materials: [], entretien: '', details: [], faq: [], priceCents: 6500,
    images: ['cabas_bleu_2.webp', 'cabasbleu3.webp', 'IMG_4826.webp'].map((f, order) => ({ path: `produits/x/${f}`, url: `${FAKE}/__test/photo/${f}`, alt: 'Cabas', order })),
    limitedEditionSize: null, giftWrap: true, tags: [], usages: [], inStock: true, aiDraft: { generatedAt: null, reviewed: true },
  });
  await photoRef.collection('variantes').doc('unique').set({ sku: 'E2E-CAT', color: null, size: null, priceCents: null, stock: 2, dimensions: null, active: true, order: 0 });
  await main(page).getByRole('link', { name: 'Générer un catalogue' }).click();
  await expect(page).toHaveURL(/\/atelier\/produits\/catalogue$/);
  const list = main(page).getByRole('list', { name: 'Pièces du catalogue' });
  // Pièce en stock cochée d'office ; pièce épuisée non sélectionnable.
  await expect(list.getByLabel(`Inclure ${FIXTURE.sizes.name}`)).toBeChecked();
  await expect(list.getByLabel(`Inclure ${FIXTURE.soldOut.name}`)).toBeDisabled();
  // On ne garde que deux pièces (la créatrice décoche le reste).
  const checkedBoxes = list.getByRole('checkbox', { checked: true });
  while (await checkedBoxes.count()) await checkedBoxes.first().uncheck();
  await list.getByLabel(`Inclure ${FIXTURE.sizes.name}`).check();
  await list.getByLabel(`Inclure ${FIXTURE.published.name}`).check();
  await list.getByLabel(`Inclure ${withPhotos}`).check();
  await main(page).getByRole('button', { name: 'Rédiger avec l’IA' }).click();
  await expect(list.getByLabel(`Texte du catalogue : ${FIXTURE.sizes.name}`)).toHaveValue(`Texte de l’IA pour ${FIXTURE.sizes.name}.`);
  await list.getByLabel(`Texte du catalogue : ${FIXTURE.sizes.name}`).fill('Texte relu par la créatrice.');
  const [pdf] = await Promise.all([page.waitForEvent('download'), main(page).getByRole('button', { name: 'Générer le PDF' }).click()]);
  expect(pdf.suggestedFilename()).toMatch(/^catalogue-jaellejc-\d{4}-\d{2}-\d{2}\.pdf$/);
  const file = await (await import('node:fs/promises')).readFile((await pdf.path())!);
  expect(file.subarray(0, 5).toString()).toBe('%PDF-');
  if (process.env.CATALOGUE_PDF_OUT) await pdf.saveAs(process.env.CATALOGUE_PDF_OUT); // relecture du rendu (rapport QA)
});
