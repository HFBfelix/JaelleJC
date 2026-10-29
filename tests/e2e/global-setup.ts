import { cleanUsers } from './auth-helpers';
import { clean, seed } from './catalogue-fixture';
import { startFakeStripe } from './fake-stripe';

// Jeu de données des parcours : ajouté avant, retiré après (retour de la fonction = nettoyage).
// Faux serveur Stripe démarré pour la durée des parcours (paiement, étape 5).
export default async function globalSetup() {
  await Promise.all([clean(), cleanUsers()]);
  await seed();
  const stripe = await startFakeStripe();
  return async () => {
    stripe.close();
    await Promise.all([clean(), cleanUsers()]);
  };
}
