import { cleanUsers } from './auth-helpers';
import { clean, seed } from './catalogue-fixture';

// Jeu de données des parcours : ajouté avant, retiré après (retour de la fonction = nettoyage).
export default async function globalSetup() {
  await Promise.all([clean(), cleanUsers()]);
  await seed();
  return async () => { await Promise.all([clean(), cleanUsers()]); };
}
