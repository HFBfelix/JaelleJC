import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import axios from "axios";
import {defineSecret} from "firebase-functions/params";

initializeApp();
const db = getFirestore();

const BREVO_API_KEY = defineSecret("BREVO_API_KEY");

/**
 * JAELLE & JC - AGENT DE SYNCHRONISATION EXPERT
 */
export const onProductAdded = onDocumentCreated({
  document: "produits/{productId}",
  secrets: [BREVO_API_KEY],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const data = snapshot.data();
  if (!data || data.agentProcessed) return;

  const productId = event.params.productId;
  const category = data.category || "Cabas";

  try {
    // 1. GÉNÉRATION DU CONTENU SEO & GEO
    const cities = ["Paris", "Deauville", "Chantilly", "Saint-Tropez", "Lille"];
    const intentions = ["cadeau de naissance", "cadeau d'entreprise"];

    const city = cities[Math.floor(Math.random() * cities.length)];
    const richDescription = `Le ${data.name} Jaelle & JC : l’élégance du 
100% coton pour vos moments d'exception. Idéal pour une escapade à ${city} 
ou un ${intentions[0]} précieux.`;

    const seoTags = [...cities, ...intentions, "artisanat"].join(", ");

    // 2. BROUILLON DE BLOG
    await db.collection("articles_blog").doc(`draft_${productId}`).set({
      title: `L'histoire derrière notre ${data.name}`,
      excerpt: `Découvrez la transformation derrière ce ${category}.`,
      content: `Au cœur de Jaelle & JC se trouve une histoire de changement. 
Ce ${data.name} reflète notre engagement pour le durable.`,
      productId: productId,
      status: "draft",
      createdAt: FieldValue.serverTimestamp(),
    });

    // 3. ENVOI EMAIL BREVO
    await axios.post("https://api.brevo.com/v3/smtp/email", {
      sender: {name: "Atelier Jaelle & JC", email: "contact@jaellejc.com"},
      to: [{email: "contact@jaellejc.com"}],
      subject: `✨ Nouveau produit prêt : ${data.name}`,
      htmlContent: `<h2>Action requise</h2><p>Le produit ${data.name} est prêt. 
Vérifiez le SEO et validez le brouillon blog sur le dashboard.</p>`,
    }, {
      headers: {
        "api-key": BREVO_API_KEY.value(),
        "Content-Type": "application/json",
      },
    });

    // 4. MISE À JOUR FINALE
    await snapshot.ref.update({
      description_seo: richDescription,
      seo_tags: seoTags,
      agentProcessed: true,
      statut: "disponible",
      lastUpdate: FieldValue.serverTimestamp(),
    });

    console.log(`✅ Agent Jaelle & JC terminé pour ${data.name}`);
  } catch (error) {
    console.error("❌ Erreur Agent :", error);
  }
});

/**
 * IA : DÉCLENCHEUR DE CONFIRMATION DE COMMANDE CLIENT
 * S'active automatiquement dès qu'une commande est créée.
 */
export const onOrderCreated = onDocumentCreated({
  document: "orders/{orderId}",
  secrets: [BREVO_API_KEY],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const orderData = snapshot.data();
  // IA : Extraction des données essentielles envoyées par le Checkout
  const { customerName, customerEmail, total } = orderData;

  try {
    await axios.post("https://api.brevo.com/v3/smtp/email", {
      sender: { name: "Maison Jaelle & JC", email: "contact@jaellejc.com" },
      to: [{ email: customerEmail, name: customerName }],
      subject: `Confirmation de votre acquisition — Commande #${event.params.orderId.slice(0, 8)}`,
      htmlContent: `
        <div style="font-family: serif; max-width: 600px; margin: auto; padding: 40px; color: #1a1a1a; border: 0.5px solid #f9f9f9;">
          <h1 style="font-style: italic; font-weight: normal; text-align: center;">Merci pour votre confiance.</h1>
          <p style="text-align: center; font-size: 14px; color: #666; margin-bottom: 40px;">
            Votre pièce Jaelle & JC est en cours de préparation dans notre atelier.
          </p>
          <hr style="border: none; border-top: 0.5px solid #eee; margin-bottom: 30px;" />
          <div style="margin-bottom: 30px;">
            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #999; margin-bottom: 10px;">Récapitulatif de l'acquisition</p>
            <p style="font-size: 14px;">Référence : <strong>#${event.params.orderId}</strong></p>
            <p style="font-size: 14px;">Montant total : <strong>${total} €</strong></p>
          </div>
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-align: center; color: #ccc; margin-top: 50px;">
            Jaelle & JC — Basiques & Intemporels
          </p>
        </div>
      `,
    }, {
      headers: {
        "api-key": BREVO_API_KEY.value(),
        "Content-Type": "application/json",
      },
    });

    console.log(`✅ Email de confirmation envoyé avec succès à ${customerEmail}`);
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email client :", error);
  }
});