/* eslint-disable max-len */
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import axios from "axios";
import {defineSecret} from "firebase-functions/params";
import Stripe from "stripe";

initializeApp();
const db = getFirestore();

const BREVO_API_KEY = defineSecret("BREVO_API_KEY");
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");

interface CartItem {
  name: string;
  price: number;
  quantity: number;
  image: string;
}

// 1. ACCUEIL AUTOMATIQUE (Nouveaux comptes)
export const onUserSignup = onDocumentCreated({
  document: "users/{userId}",
  secrets: [BREVO_API_KEY],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const userData = snapshot.data();
  const email = userData.email;
  const name = userData.displayName || "Cher client";

  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {name: "Atelier Jaelle & JC", email: "contact@jaellejc.com"},
        to: [{email: email, name: name}],
        subject: "Bienvenue dans l'univers Jaelle & JC",
        htmlContent: `
          <div style="font-family: serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
            <h1 style="font-style: italic; font-weight: normal; text-align: center; margin-bottom: 40px;">Bienvenue à l'Atelier</h1>
            <p>Bonjour ${name},</p>
            <p>Nous sommes ravis de vous compter parmi nous. L'Atelier Jaelle & JC est né d'une envie simple : dessiner un vestiaire de l'essentiel, où chaque pièce raconte une histoire de transmission et de savoir-faire français.</p>
            <div style="text-align: center; margin: 40px 0;">
              <a href="https://jaellejc.web.app/collection" style="background: #000; color: #fff; padding: 15px 30px; text-decoration: none; text-transform: uppercase; font-size: 11px; letter-spacing: 2px;">Explorer les pièces</a>
            </div>
            <p style="font-size: 13px; color: #666; font-style: italic;">"De belles matières, l'amour de l'artisanat."</p>
            <hr style="border: none; border-top: 0.5px solid #eee; margin-top: 50px;" />
            <p style="font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 1px; text-align: center;">© 2026 — Jaelle & JC Atelier</p>
          </div>
        `,
      },
      {headers: {"api-key": BREVO_API_KEY.value()}}
    );
  } catch (error) {
    console.error("Erreur envoi bienvenue :", error);
  }
});

// 2. ALERTES CONCIERGERIE (Nouveaux messages contact)
export const onNewContact = onDocumentCreated({
  document: "contacts/{contactId}",
  secrets: [BREVO_API_KEY],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const data = snapshot.data();

  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {name: "Atelier Jaelle & JC", email: "contact@jaellejc.com"},
        to: [{email: "contact@jaellejc.com"}],
        subject: `Nouveau message de ${data.name}`,
        htmlContent: `
          <h3>Nouveau message reçu depuis le site</h3>
          <p><strong>Nom :</strong> ${data.name}</p>
          <p><strong>Email :</strong> ${data.email}</p>
          <p><strong>Message :</strong> ${data.message}</p>
        `,
      },
      {headers: {"api-key": BREVO_API_KEY.value()}}
    );
  } catch (error) {
    console.error("Erreur alerte contact :", error);
  }
});

// 3. ALERTES NEWSLETTER (Nouveaux abonnés)
export const onNewsletterSignup = onDocumentCreated({
  document: "newsletter/{id}",
  secrets: [BREVO_API_KEY],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const data = snapshot.data();

  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {name: "Atelier Jaelle & JC", email: "contact@jaellejc.com"},
        to: [{email: "contact@jaellejc.com"}],
        subject: "Nouvel abonné à la newsletter",
        htmlContent: `<p>Un nouveau client souhaite suivre l'Atelier : <strong>${data.email}</strong></p>`,
      },
      {headers: {"api-key": BREVO_API_KEY.value()}}
    );
  } catch (error) {
    console.error("Erreur alerte newsletter :", error);
  }
});

// 4. AGENT IA STRATÉGIQUE
export const onProductAdded = onDocumentCreated({
  document: "produits/{productId}",
  secrets: [BREVO_API_KEY, STRIPE_SECRET_KEY],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const data = snapshot.data();
  if (!data || data.agentProcessed) return;
  try {
    const {name, matieres, dimensions, category} = data;
    const seoTags = data.seo_tags || "";
    const generatedDescription = `Cette pièce unique, baptisée ${name}, incarne l'essence de l'Atelier Jaelle & JC. Façonnée à la main en ${matieres || "matières nobles"}, elle présente des dimensions de ${dimensions || "proportions équilibrées"} pour un porté élégant et intemporel.`;
    const blogTitle = `L'âme du ${name} : Entre héritage et modernité`;
    const blogContent = `[Introduction Incarnée] Dans un monde où tout s'accélère, l'Atelier Jaelle & JC choisit la pause. La création du ${name} n'est pas le fruit d'une tendance, mais d'une émotion... [Mise en Perspective : Anti Fast-Fashion] Face à la surproduction, nous prônons l'intemporalité. Choisir une pièce Jaelle & JC, c'est refuser l'éphémère pour embrasser la durabilité... [Présentation Détaillée] Le ${name}, avec ses finitions en ${matieres || "matières choisies"}, a été pensé pour accompagner le quotidien des mamans urbaines de Paris à Neuilly-sur-Seine... [Positionnement Cadeau & Lifestyle] Qu'il s'agisse d'un cadeau de naissance made in France ou d'une attention raffinée pour un collaborateur en entreprise, cette pièce traverse les saisons... [Lien ADN & Conclusion] Fabriqué avec passion en Île-de-France, le ${name} est une promesse de transmission. Une élégance simple, chic, et résolument humaine.`;
    await snapshot.ref.update({
      description: generatedDescription,
      status: "draft",
      agentProcessed: true,
      seo_metadata: {
        intents: [
          `Cadeau naissance luxe made in France pour ${category}`,
          "Accessoire artisanal chic pour maman urbaine",
          "Maroquinerie durable Neuilly-sur-Seine",
          "Idée cadeau baptême élégant et intemporel",
        ],
        alt_text: `${name} Jaelle & JC - Artisanat français haut de gamme.`,
        geo_context: "Paris, Neuilly-sur-Seine, Île-de-France",
        invisible_tags: seoTags,
      },
      lastUpdate: FieldValue.serverTimestamp(),
    });
    await db.collection("articles_blog").add({
      title: blogTitle,
      excerpt: `Découvrez l'histoire du ${name}, une pièce pensée pour la transmission et l'élégance durable.`,
      content: blogContent,
      productId: event.params.productId,
      image: data.images?.[0] || "",
      status: "draft",
      tags: ["Made in France", "Luxe Responsable", category],
      createdAt: FieldValue.serverTimestamp(),
    });
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {name: "Atelier Jaelle & JC", email: "contact@jaellejc.com"},
        to: [{email: "contact@jaellejc.com"}],
        subject: `IA : Brouillons prêts pour ${name} (Validation requise)`,
        htmlContent: `<p>Le travail de l'IA est terminé pour <strong>${name}</strong>. <a href="https://jaellejc.web.app/createur">Ouvrir l'Atelier</a></p>`,
      },
      {headers: {"api-key": BREVO_API_KEY.value()}}
    );
  } catch (error) {
    console.error("Erreur Agent IA Stratégique :", error);
  }
});

// 5. CRM & CONFIRMATION DE COMMANDE
export const onOrderCreated = onDocumentCreated({
  document: "orders/{orderId}",
  secrets: [BREVO_API_KEY],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const {customerName, customerEmail, total} = snapshot.data();
  const refOrder = `#${event.params.orderId.slice(0, 8).toUpperCase()}`;
  try {
    await axios.post(
      "https://api.brevo.com/v3/contacts",
      {
        email: customerEmail,
        attributes: {NOM: customerName || "", IS_CUSTOMER: true, MONTANT_TOTAL: total},
        listIds: [2],
        updateEnabled: true,
      },
      {headers: {"api-key": BREVO_API_KEY.value()}}
    );
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {name: "Jaelle & JC", email: "contact@jaellejc.com"},
        to: [{email: customerEmail, name: customerName}],
        subject: `Confirmation de votre acquisition - ${refOrder}`,
        htmlContent: `<p>Merci ${customerName}, votre pièce est en préparation.</p>`,
      },
      {headers: {"api-key": BREVO_API_KEY.value()}}
    );
  } catch (error) {
    console.error("Erreur CRM :", error);
  }
});

// 6. PAIEMENT STRIPE
export const createStripeCheckout = onCall({
  secrets: [STRIPE_SECRET_KEY],
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Connexion requise.");
  const reqData = request.data as {
    cartItems: CartItem[],
    customerEmail: string,
    deliveryFee: number,
    success_url: string,
    cancel_url: string
  };
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const lineItems = reqData.cartItems.map((item) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: item.name,
          images: [item.image || ""],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));
    if (reqData.deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: "Livraison sécurisée",
            images: ["https://jaellejc.web.app/delivery-icon.png"],
          },
          unit_amount: Math.round(reqData.deliveryFee * 100),
        },
        quantity: 1,
      });
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: reqData.customerEmail || request.auth.token.email,
      line_items: lineItems,
      mode: "payment",
      success_url: reqData.success_url || "https://jaellejc.web.app/success",
      cancel_url: reqData.cancel_url || "https://jaellejc.web.app/cart",
    });
    return {url: session.url};
  } catch (error) {
    console.error("Erreur Stripe :", error);
    throw new HttpsError("internal", "Erreur Stripe.");
  }
});
