// Données FICTIVES pour la visualisation locale (émulateurs uniquement, projet demo-jaellejc).
// Lancer après `npm run emulateurs` : npm run seed:emulateur
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

// Compte admin fictif : à choisir dans la fenêtre Google de l'émulateur (« Add new account »).
const ADMIN_EMAIL = 'admin@exemple.test';

const env = await initializeTestEnvironment({
  projectId: 'demo-jaellejc',
  firestore: { host: '127.0.0.1', port: 8080 },
});

const at = (daysAgo) => Timestamp.fromDate(new Date(Date.now() - daysAgo * 86400000));

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();

  await setDoc(doc(db, 'autorisations', ADMIN_EMAIL), { actif: true });
  await setDoc(doc(db, 'settings', 'delivery'), { freeThreshold: 150, flatRate: 6.9, zones: 'France' });

  await setDoc(doc(db, 'categories', 'Bébé'), { subs: ['Capes de bain', 'Couvertures'] });
  await setDoc(doc(db, 'categories', 'Femmes'), { subs: ['Cabas'] });

  const produits = [
    { id: 'demo-cape', name: 'CAPE DE BAIN DÉMO', price: 89, stock: 3, category: 'Bébé', subCategory: 'Capes de bain', images: ['/assets/IMG_4826.webp'], status: 'published', createdAt: at(1) },
    { id: 'demo-couverture', name: 'COUVERTURE DÉMO', price: 120, stock: 1, category: 'Bébé', subCategory: 'Couvertures', images: ['/assets/IMG_4831.webp'], status: 'published', createdAt: at(2) },
    { id: 'demo-cabas', name: 'CABAS BLEU DÉMO', price: 65, stock: 0, category: 'Femmes', subCategory: 'Cabas', images: ['/assets/cabasbleu3.webp'], status: 'published', createdAt: at(3) },
    { id: 'demo-brouillon', name: 'BROUILLON DÉMO (NE DOIT PAS ÊTRE VENDU APRÈS LA LIVRAISON B)', price: 45, stock: 5, category: 'Bébé', subCategory: 'Couvertures', images: ['/assets/IMG_4836.webp'], status: 'draft', createdAt: at(4) },
  ];
  for (const { id, ...data } of produits) {
    await setDoc(doc(db, 'produits', id), {
      ...data,
      description: 'Pièce fictive pour la visualisation locale.',
      matieres: 'Gaze de coton (fictif)',
      dimensions: '70 × 70 cm (fictif)',
      agentProcessed: true,
    });
  }
});

await env.cleanup();
console.log(`Données fictives créées. Compte admin à utiliser dans /createur : ${ADMIN_EMAIL}`);
