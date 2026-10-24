import { defineConfig, devices } from '@playwright/test';

// Captures de référence (ancien site) et comparaison (nouveau site), mobile + ordinateur.
export default defineConfig({
  testDir: './tests/visual',
  snapshotPathTemplate: '{testDir}/reference/{projectName}/{arg}{ext}',
  fullyParallel: true,
  reporter: 'list',
  expect: { toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01 } },
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:3000', locale: 'fr-FR' },
  projects: [
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
});
