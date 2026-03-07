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
              <a href="https://jaellejc.com/collection" style="background: #000; color: #fff; padding: 15px 30px; text-decoration: none; text-transform: uppercase; font-size: 11px; letter-spacing: 2px;">Explorer les pièces</a>
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
        htmlContent: `<p>Le travail de l'IA est terminé pour <strong>${name}</strong>. <a href="https://jaellejc.com/createur">Ouvrir l'Atelier</a></p>`,
      },
      {headers: {"api-key": BREVO_API_KEY.value()}}
    );
  } catch (error) {
    console.error("Erreur Agent IA Stratégique :", error);
  }
});

// 5. CRM & CONFIRMATION DE COMMANDE + ALERTE ATELIER
export const onOrderCreated = onDocumentCreated({
  document: "orders/{orderId}",
  secrets: [BREVO_API_KEY],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const orderData = snapshot.data();
  const amount = orderData.total || orderData.amount || 0;
  const {customerName, customerEmail, deliveryFee, items, shippingAddress, customerPhone} = orderData;
  const refOrder = `#${event.params.orderId.slice(0, 8).toUpperCase()}`;
  const logoUrl = "https://jaellejc.com/assets/Logo%20noirJaelle&JC_v2.png";

  try {
    // 5a. MISE À JOUR CRM BREVO
    await axios.post(
      "https://api.brevo.com/v3/contacts",
      {
        email: customerEmail,
        attributes: {NOM: customerName || "", IS_CUSTOMER: true, DERNIER_ACHAT: amount},
        listIds: [2],
        updateEnabled: true,
      },
      {headers: {"api-key": BREVO_API_KEY.value()}}
    );

    // 5b. CONSTRUCTION DU TABLEAU DES PRODUITS
    const itemsHtml = items.map((item: {name: string, quantity: number, price: number}) => `
      <tr>
        <td style="padding: 15px 0; border-bottom: 0.5px solid #eee; font-family: serif; font-style: italic; font-size: 14px;">${item.name}</td>
        <td style="padding: 15px 0; border-bottom: 0.5px solid #eee; text-align: center; font-size: 12px; color: #666;">${item.quantity}</td>
        <td style="padding: 15px 0; border-bottom: 0.5px solid #eee; text-align: right; font-size: 13px; font-weight: 300;">${item.price} €</td>
      </tr>
    `).join("");

    // 5c. ENVOI MAIL AU CLIENT (DESIGN COMPLET)
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {name: "Jaelle & JC", email: "contact@jaellejc.com"},
        to: [{email: customerEmail, name: customerName}],
        subject: `Confirmation de votre acquisition — ${refOrder}`,
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <body style="margin: 0; padding: 0; background-color: #ffffff; color: #1a1a1a; font-family: sans-serif;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: auto; padding: 40px 20px;">
              <tr>
                <td align="center" style="padding-bottom: 50px;">
                  <img src="${logoUrl}" alt="Jaelle & JC" width="180" style="display: block; border: 0;" />
                  <div style="height: 1px; width: 30px; background-color: #000; margin-top: 25px; margin-left: auto; margin-right: auto;"></div>
                </td>
              </tr>
              <tr><td style="font-family: serif; font-size: 22px; font-style: italic; padding-bottom: 25px;">Bonjour ${customerName || "Cher client"},</td></tr>
              <tr><td style="font-size: 13px; line-height: 1.8; color: #666; padding-bottom: 40px;">Nous avons le plaisir de vous confirmer la réception de votre commande. Chaque pièce est préparée avec soin dans notre atelier.</td></tr>
              <tr>
                <td>
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #000; padding-top: 10px;">
                    <thead>
                      <tr>
                        <th align="left" style="font-size: 9px; text-transform: uppercase; color: #999;">Pièce</th>
                        <th align="center" style="font-size: 9px; text-transform: uppercase; color: #999;">Qté</th>
                        <th align="right" style="font-size: 9px; text-transform: uppercase; color: #999;">Prix</th>
                      </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding-top: 25px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr><td style="font-size: 10px; text-transform: uppercase; color: #999;">Livraison</td><td align="right" style="font-size: 13px;">${deliveryFee === 0 ? "Offerte" : deliveryFee + " €"}</td></tr>
                    <tr><td style="font-size: 10px; text-transform: uppercase; font-weight: bold; padding-top: 10px;">Total</td><td align="right" style="font-size: 22px; font-family: serif; padding-top: 10px;">${amount} €</td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding-top: 50px;">
                  <div style="background-color: #fcfcfc; padding: 25px; border-left: 1px solid #000;">
                    <h4 style="font-size: 9px; text-transform: uppercase; color: #999;">Détails d'expédition</h4>
                    <p style="font-family: serif; font-style: italic; font-size: 13px; color: #333;">${shippingAddress}</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-top: 70px;">
                  <a href="https://jaellejc.com/newsletter?email=${customerEmail}" style="display: inline-block; padding: 18px 35px; background-color: #000; color: #fff; text-decoration: none; font-size: 9px; text-transform: uppercase; letter-spacing: 3px;">Rejoindre la Newsletter</a>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      },
      {headers: {"api-key": BREVO_API_KEY.value()}}
    );

    // 5d. ENVOI ALERTE À L'ATELIER (POUR TOI)
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {name: "Système Atelier", email: "contact@jaellejc.com"},
        to: [{email: "contact@jaellejc.com"}],
        subject: `🚨 NOUVELLE COMMANDE — ${refOrder}`,
        htmlContent: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
            <h2 style="font-size: 14px; text-transform: uppercase;">Alerte Nouvelle Vente</h2>
            <p><strong>Référence :</strong> ${refOrder}</p>
            <p><strong>Client :</strong> ${customerName} (${customerEmail})</p>
            <p><strong>Tél :</strong> ${customerPhone || "Non renseigné"}</p>
            <hr />
            <table width="100%">${itemsHtml}</table>
            <p><strong>Total encaissé : ${amount} €</strong></p>
            <p><strong>Adresse :</strong> ${shippingAddress}</p>
          </div>
        `,
      },
      {headers: {"api-key": BREVO_API_KEY.value()}}
    );

  } catch (error) {
    console.error("Erreur CRM / Notification :", error);
  }
});

// 6. PAIEMENT STRIPE (Création de session)
export const createStripeCheckout = onCall({
  secrets: [STRIPE_SECRET_KEY],
}, async (request) => {
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
            images: ["https://jaellejc.com/delivery-icon.png"],
          },
          unit_amount: Math.round(reqData.deliveryFee * 100),
        },
        quantity: 1,
      });
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: reqData.customerEmail || (request.auth ? request.auth.token.email : undefined),
      line_items: lineItems,
      mode: "payment",
      success_url: `${reqData.success_url || "https://jaellejc.com/success"}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: reqData.cancel_url || "https://jaellejc.com/cart",
      payment_intent_data: {
        description: `Commande Jaelle & JC - Client: ${reqData.customerEmail}`,
      },
    });
    return {url: session.url, sessionId: session.id};
  } catch (error) {
    console.error("Erreur Stripe :", error);
    throw new HttpsError("internal", "Erreur Stripe.");
  }
});

// 7. RÉCUPÉRATION DES DÉTAILS DE PAIEMENT
export const getStripeSessionDetails = onCall({
  secrets: [STRIPE_SECRET_KEY],
}, async (request) => {
  const {sessionId} = request.data as {sessionId: string};
  if (!sessionId) throw new HttpsError("invalid-argument", "Session ID manquant.");

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent.payment_method"],
    });

    const paymentIntent = session.payment_intent as Stripe.PaymentIntent;
    const paymentMethod = paymentIntent?.payment_method as Stripe.PaymentMethod;

    return {
      paymentIntentId: paymentIntent?.id || "",
      fingerprint: paymentMethod?.card?.fingerprint || "non-disponible",
      status: session.payment_status,
    };
  } catch (error) {
    console.error("Erreur récupération détails Stripe :", error);
    throw new HttpsError("internal", "Impossible de récupérer les détails.");
  }
});
