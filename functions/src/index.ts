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

// ─── CONFIGURATION VISUELLE COMMUNE (LUXE & RESPONSIVE) ──────────────────
const LOGO_URL = "https://jaellejc.com/assets/logomail.png";

const getEmailLayout = (content: string) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media only screen and (max-width: 600px) {
        .container { width: 100% !important; padding: 20px !important; }
        .content { padding: 30px 0 !important; }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #ffffff; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff;">
      <tr>
        <td align="center" style="padding: 20px;">
          <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="width: 600px; margin: auto;">
            <tr>
              <td align="center" style="padding: 40px 0; border-bottom: 0.5px solid #f0f0f0;">
                <img src="${LOGO_URL}" alt="Jaelle & JC" width="160" style="display: block; border: 0;" />
                <div style="font-size: 8px; text-transform: uppercase; letter-spacing: 0.4em; color: #999; margin-top: 15px;">Atelier</div>
              </td>
            </tr>
            <tr>
              <td class="content" style="padding: 50px 0;">
                ${content}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top: 50px; border-top: 0.5px solid #f0f0f0;">
                <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #cccccc; margin: 0;">© 2026 — Jaelle & JC</p>
                <p style="font-family: serif; font-style: italic; font-size: 12px; color: #999; margin-top: 10px;">Basiques & Intemporels</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
`;

interface CartItem {
  name: string;
  price: number;
  quantity: number;
  image: string;
}

// 1. BIENVENUE AUTOMATIQUE
export const onUserSignup = onDocumentCreated({
  document: "users/{userId}",
  secrets: [BREVO_API_KEY],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }
  const userData = snapshot.data();
  const email = userData.email;
  const name = userData.displayName || "Cher client";

  const content = `
    <h1 style="font-family: serif; font-style: italic; font-weight: normal; font-size: 26px; text-align: center; margin-bottom: 30px;">Bienvenue à l'Atelier</h1>
    <p style="font-size: 14px; line-height: 1.8;">Bonjour ${name},</p>
    <p style="font-size: 14px; line-height: 1.8;">Nous sommes ravis de vous compter parmi nous. L'Atelier Jaelle & JC est né d'une envie simple : dessiner un vestiaire de l'essentiel, où chaque pièce raconte une histoire de transmission et de savoir-faire français.</p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="https://jaellejc.com/collection" style="display: inline-block; background: #000; color: #fff; padding: 18px 35px; text-decoration: none; text-transform: uppercase; font-size: 10px; letter-spacing: 3px;">Explorer la collection</a>
    </div>
    <p style="font-size: 13px; color: #666; font-style: italic; text-align: center;">"De belles matières, l'amour de l'artisanat."</p>
  `;

  try {
    await axios.post("https://api.brevo.com/v3/smtp/email", {
      sender: {name: "Jaelle & JC", email: "contact@jaellejc.com"},
      to: [{email: email, name: name}],
      subject: "Bienvenue dans l'univers Jaelle & JC",
      htmlContent: getEmailLayout(content),
    }, {headers: {"api-key": BREVO_API_KEY.value()}});
  } catch (error) {
    console.error("Erreur bienvenue :", error);
  }
});

// 2. ALERTES CONCIERGERIE
export const onNewContact = onDocumentCreated({
  document: "contacts/{contactId}",
  secrets: [BREVO_API_KEY],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }
  const data = snapshot.data();

  const content = `
    <h2 style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px;">Nouveau Message Site</h2>
    <p style="font-size: 14px;"><strong>De :</strong> ${data.name} (${data.email})</p>
    <div style="background: #f9f9f9; padding: 20px; font-style: italic; border-left: 2px solid #000; margin: 20px 0;">
      ${data.message}
    </div>
  `;

  try {
    await axios.post("https://api.brevo.com/v3/smtp/email", {
      sender: {name: "Atelier Jaelle & JC", email: "contact@jaellejc.com"},
      to: [{email: "contact@jaellejc.com"}],
      subject: `Nouveau message de ${data.name}`,
      htmlContent: getEmailLayout(content),
    }, {headers: {"api-key": BREVO_API_KEY.value()}});
  } catch (error) {
    console.error("Erreur contact :", error);
  }
});

// 3. ALERTES NEWSLETTER
export const onNewsletterSignup = onDocumentCreated({
  document: "newsletter/{id}",
  secrets: [BREVO_API_KEY],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }
  const data = snapshot.data();

  try {
    await axios.post("https://api.brevo.com/v3/smtp/email", {
      sender: {name: "Atelier Jaelle & JC", email: "contact@jaellejc.com"},
      to: [{email: "contact@jaellejc.com"}],
      subject: "Nouvel abonné à la newsletter",
      htmlContent: getEmailLayout(`<p>Un nouveau client souhaite suivre l'Atelier : <strong>${data.email}</strong></p>`),
    }, {headers: {"api-key": BREVO_API_KEY.value()}});
  } catch (error) {
    console.error("Erreur newsletter :", error);
  }
});

// 4. AGENT IA STRATÉGIQUE
export const onProductAdded = onDocumentCreated({
  document: "produits/{productId}",
  secrets: [BREVO_API_KEY, STRIPE_SECRET_KEY],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }
  const data = snapshot.data();
  if (!data || data.agentProcessed) {
    return;
  }
  try {
    const {name, matieres, dimensions, category} = data;
    const seoTags = data.seo_tags || "";
    // On utilise bien 'dimensions' ici pour satisfaire le Lint
    const generatedDescription = `Cette pièce unique baptisée ${name} incarne l'essence de l'Atelier. Façonnée à la main en ${matieres || "matières nobles"}, elle présente des dimensions de ${dimensions || "proportions équilibrées"}.`;

    await snapshot.ref.update({
      description: generatedDescription,
      status: "draft",
      agentProcessed: true,
      seo_metadata: {
        intents: [`Cadeau naissance luxe made in France pour ${category}`, "Accessoire artisanal chic"],
        alt_text: `${name} Jaelle & JC - Artisanat français.`,
        geo_context: "Paris, Neuilly-sur-Seine",
        invisible_tags: seoTags,
      },
      lastUpdate: FieldValue.serverTimestamp(),
    });

    await db.collection("articles_blog").add({
      title: `L'âme du ${name} : Entre héritage et modernité`,
      excerpt: `Découvrez l'histoire du ${name}...`,
      content: "Brouillon généré par l'IA...",
      productId: event.params.productId,
      image: data.images?.[0] || "",
      status: "draft",
      tags: ["Made in France", category],
      createdAt: FieldValue.serverTimestamp(),
    });

    await axios.post("https://api.brevo.com/v3/smtp/email", {
      sender: {name: "Atelier Jaelle & JC", email: "contact@jaellejc.com"},
      to: [{email: "contact@jaellejc.com"}],
      subject: `IA : Brouillons prêts pour ${name}`,
      htmlContent: getEmailLayout(`<p>Le travail de l'IA est terminé pour <strong>${name}</strong>. Dimensions prises en compte : ${dimensions || "Standard"}.</p>`),
    }, {headers: {"api-key": BREVO_API_KEY.value()}});
  } catch (error) {
    console.error("Erreur IA :", error);
  }
});

// 5. CONFIRMATION DE COMMANDE + CRM
export const onOrderCreated = onDocumentCreated({
  document: "orders/{orderId}",
  secrets: [BREVO_API_KEY],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }

  const orderData = snapshot.data();
  const amount = orderData.total || orderData.amount || 0;
  const {customerName, customerEmail, deliveryFee, items, shippingAddress, customerPhone} = orderData;
  const refOrder = `#${event.params.orderId.slice(0, 8).toUpperCase()}`;

  try {
    await axios.post("https://api.brevo.com/v3/contacts", {
      email: customerEmail,
      attributes: {NOM: customerName || "", IS_CUSTOMER: true, DERNIER_ACHAT: amount},
      listIds: [2],
      updateEnabled: true,
    }, {headers: {"api-key": BREVO_API_KEY.value()}});

    const itemsHtml = items.map((item: {name: string, quantity: number, price: number}) => `
      <tr>
        <td style="padding: 15px 0; border-bottom: 0.5px solid #eee; font-family: serif; font-style: italic; font-size: 14px;">${item.name}</td>
        <td align="center" style="padding: 15px 0; border-bottom: 0.5px solid #eee; font-size: 12px; color: #666;">${item.quantity}</td>
        <td align="right" style="padding: 15px 0; border-bottom: 0.5px solid #eee; font-size: 13px;">${item.price} €</td>
      </tr>
    `).join("");

    const clientContent = `
      <div style="text-align: center; margin-bottom: 40px;">
        <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #999;">Acquisition confirmée</span>
        <h1 style="font-family: serif; font-style: italic; font-weight: normal; font-size: 28px; margin: 10px 0;">Merci pour votre commande.</h1>
        <p style="font-size: 12px; color: #666;">Référence : ${refOrder}</p>
      </div>
      <p style="font-size: 14px;">Bonjour ${customerName || "Cher client"},</p>
      <p style="font-size: 14px; color: #666; margin-bottom: 40px;">Nous préparons votre sélection avec le plus grand soin. Voici le détail de votre commande :</p>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #000;">
        <thead>
          <tr>
            <th align="left" style="padding: 15px 0; font-size: 9px; text-transform: uppercase; color: #999;">Pièce</th>
            <th align="center" style="padding: 15px 0; font-size: 9px; text-transform: uppercase; color: #999;">Qté</th>
            <th align="right" style="padding: 15px 0; font-size: 9px; text-transform: uppercase; color: #999;">Prix</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
        <tr><td style="font-size: 11px; text-transform: uppercase; color: #999;">Livraison</td><td align="right" style="font-size: 13px;">${deliveryFee === 0 ? "Offerte" : deliveryFee + " €"}</td></tr>
        <tr><td style="padding-top: 15px; font-size: 11px; text-transform: uppercase; font-weight: bold;">Total</td><td align="right" style="padding-top: 15px; font-size: 22px; font-family: serif; font-style: italic;">${amount} €</td></tr>
      </table>
      <div style="background-color: #fafafa; padding: 25px; border-left: 1px solid #000; margin-bottom: 40px;">
        <h4 style="font-size: 9px; text-transform: uppercase; color: #999; margin: 0 0 10px 0;">Détails d'expédition</h4>
        <p style="font-family: serif; font-style: italic; font-size: 14px; color: #333; margin: 0;">${shippingAddress}</p>
        <p style="font-size: 12px; color: #666; margin-top: 10px;">Contact : ${customerPhone || "Non renseigné"}</p>
      </div>
    `;

    await axios.post("https://api.brevo.com/v3/smtp/email", {
      sender: {name: "Jaelle & JC", email: "contact@jaellejc.com"},
      to: [{email: customerEmail, name: customerName}],
      subject: `Votre commande Jaelle & JC — ${refOrder}`,
      htmlContent: getEmailLayout(clientContent),
    }, {headers: {"api-key": BREVO_API_KEY.value()}});

    await axios.post("https://api.brevo.com/v3/smtp/email", {
      sender: {name: "Atelier", email: "contact@jaellejc.com"},
      to: [{email: "contact@jaellejc.com"}],
      subject: `🚨 COMMANDE — ${refOrder}`,
      htmlContent: `<h2>Nouvelle vente</h2><p>Client: ${customerName}</p><p>Total: ${amount} €</p><p>Tel: ${customerPhone || "N/A"}</p>`,
    }, {headers: {"api-key": BREVO_API_KEY.value()}});
  } catch (error) {
    console.error("Erreur commande :", error);
  }
});

// 6. PAIEMENT STRIPE
export const createStripeCheckout = onCall({
  secrets: [STRIPE_SECRET_KEY],
}, async (request) => {
  const reqData = request.data as {cartItems: CartItem[], customerEmail: string, deliveryFee: number, success_url: string, cancel_url: string};
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = reqData.cartItems.map((item) => ({
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
      customer_email: reqData.customerEmail,
      line_items: lineItems,
      mode: "payment",
      success_url: reqData.success_url,
      cancel_url: reqData.cancel_url,
    });
    return {url: session.url, sessionId: session.id};
  } catch (error) {
    console.error("Erreur Stripe :", error);
    throw new HttpsError("internal", "Erreur Stripe.");
  }
});

// 7. DÉTAILS STRIPE
export const getStripeSessionDetails = onCall({
  secrets: [STRIPE_SECRET_KEY],
}, async (request) => {
  const {sessionId} = request.data as {sessionId: string};
  if (!sessionId) {
    throw new HttpsError("invalid-argument", "Session ID manquant.");
  }
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const session = await stripe.checkout.sessions.retrieve(sessionId, {expand: ["payment_intent.payment_method"]});
    const paymentIntent = session.payment_intent as Stripe.PaymentIntent;
    const paymentMethod = paymentIntent?.payment_method as Stripe.PaymentMethod;
    return {paymentIntentId: paymentIntent?.id || "", fingerprint: paymentMethod?.card?.fingerprint || "non-disponible", status: session.payment_status};
  } catch (error) {
    console.error("Erreur détails :", error);
    throw new HttpsError("internal", "Erreur.");
  }
});
