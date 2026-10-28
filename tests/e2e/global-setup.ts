import { clean, seed } from './catalogue-fixture';

// Jeu de données des parcours : ajouté avant, retiré après (retour de la fonction = nettoyage).
export default async function globalSetup() {
  await clean();
  await seed();
  return async () => { await clean(); };
}
