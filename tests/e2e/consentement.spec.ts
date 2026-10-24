// RGPD : aucun traceur avant « Tout accepter » ; « Continuer sans accepter » = aucun traceur.
import { test, expect, type Page } from '@playwright/test';

const TRACKER = /googletagmanager\.com|google-analytics\.com/;

// Les appels aux traceurs sont interceptés et comptés, jamais envoyés à Google.
async function countTrackerRequests(page: Page) {
  const calls: string[] = [];
  await page.route(TRACKER, (route) => {
    calls.push(route.request().url());
    return route.fulfill({ status: 204, body: '' });
  });
  return calls;
}

test('premier passage : bandeau affiché, aucun traceur', async ({ page }) => {
  const calls = await countTrackerRequests(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Tout accepter' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuer sans accepter' })).toBeVisible();
  await page.waitForTimeout(1000);
  expect(calls).toEqual([]);
});

test('« Continuer sans accepter » : aucun traceur, même après rechargement', async ({ page }) => {
  const calls = await countTrackerRequests(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuer sans accepter' }).click();
  await expect(page.getByRole('button', { name: 'Tout accepter' })).toBeHidden();
  await page.reload();
  await page.waitForTimeout(1000);
  await expect(page.getByRole('button', { name: 'Tout accepter' })).toBeHidden();
  expect(calls).toEqual([]);
});

test('« Tout accepter » : Analytics chargé, bandeau plus affiché', async ({ page }) => {
  const calls = await countTrackerRequests(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Tout accepter' }).click();
  await page.waitForLoadState('load');
  await expect.poll(() => calls.length).toBeGreaterThan(0);
  expect(calls[0]).toContain('id=G-BHFEM85RCJ');
  await expect(page.getByRole('button', { name: 'Tout accepter' })).toBeHidden();
});

test('valeur trafiquée dans le stockage : traitée comme un refus de choix', async ({ page }) => {
  const calls = await countTrackerRequests(page);
  await page.addInitScript(() => localStorage.setItem('jaellejc-cookies', 'oui'));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Tout accepter' })).toBeVisible();
  await page.waitForTimeout(1000);
  expect(calls).toEqual([]);
});
