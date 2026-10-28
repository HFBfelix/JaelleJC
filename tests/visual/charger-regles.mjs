// Comparaison visuelle : charge des règles dans l'émulateur Firestore, sans toucher aux données.
//   node tests/visual/charger-regles.mjs anciennes   → règles de `main` (celles de l'ancien site, pour ses captures)
//   node tests/visual/charger-regles.mjs nouvelles   → firestore.rules de la branche
// Émulateur uniquement (projet fictif demo-jaellejc).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

const which = process.argv[2];
const rules = which === 'anciennes'
  ? execFileSync('git', ['show', 'main:firestore.rules'], { encoding: 'utf8' })
  : readFileSync('firestore.rules', 'utf8');

await initializeTestEnvironment({
  projectId: 'demo-jaellejc',
  firestore: { rules, host: '127.0.0.1', port: 8080 },
});
console.log(`Règles ${which === 'anciennes' ? 'de main (ancien site)' : 'de la branche'} chargées dans l'émulateur.`);
process.exit(0);
