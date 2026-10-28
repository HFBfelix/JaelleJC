import { defineConfig, devices } from '@playwright/test';

// Parcours (e2e) contre le site construit : `npm run build` puis `npm run test:e2e`.
export default defineConfig({
  testDir: './tests/e2e',
  // Catalogue fictif ajouté dans l'émulateur avant les parcours, retiré après.
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:3000', locale: 'fr-FR' },
  webServer: process.env.BASE_URL
    ? undefined
    : { command: 'npm run start', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'] } },
    { name: 'iphone-safari', use: { ...devices['iPhone 13'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
