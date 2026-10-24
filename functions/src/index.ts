/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import axios from "axios";
import {defineSecret, defineString} from "firebase-functions/params";
import Stripe from "stripe";
import OpenAI from "openai";
import {
  CheckoutComputation, CheckoutError, CheckoutProduct, DeliverySettings,
  computeCheckout, parseCheckoutRequest, resolveSiteOrigin,
} from "./checkout";
import {escapeHtml, escapeMultiline} from "./escape";

initializeApp();
const db = getFirestore();

const BREVO_API_KEY = defineSecret("BREVO_API_KEY");
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
// Origines autorisées pour le retour après paiement (la première sert par défaut).
// Sur le staging : ALLOWED_ORIGINS dans functions/.env.<projet>.
const ALLOWED_ORIGINS = defineString("ALLOWED_ORIGINS", {default: "https://jaellejc.com,https://www.jaellejc.com"});
// Étape 0, livraison A : les brouillons sont encore visibles sur le site, donc encore vendables.
// Passe à true dans la livraison B (hotfix-publies), avec le filtre « published » du site.
const REQUIRE_PUBLISHED = false;

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
    <p style="font-size: 14px; line-height: 1.8;">Bonjour ${escapeHtml(name)},</p>
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
    <p style="font-size: 14px;"><strong>De :</strong> ${escapeHtml(data.name)} (${escapeHtml(data.email)})</p>
    <div style="background: #f9f9f9; padding: 20px; font-style: italic; border-left: 2px solid #000; margin: 20px 0;">
      ${escapeMultiline(data.message)}
    </div>
  `;

  try {
    await axios.post("https://api.brevo.com/v3/smtp/email", {
      sender: {name: "Atelier Jaelle & JC", email: "contact@jaellejc.com"},
      to: [{email: "contact@jaellejc.com"}],
      subject: `Nouveau message de ${String(data.name || "").replace(/[\r\n]/g, " ").slice(0, 100)}`,
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
      htmlContent: getEmailLayout(`<p>Un nouveau client souhaite suivre l'Atelier : <strong>${escapeHtml(data.email)}</strong></p>`),
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
      htmlContent: getEmailLayout(`<p>Le travail de l'IA est terminé pour <strong>${escapeHtml(name)}</strong>. Dimensions prises en compte : ${escapeHtml(dimensions || "Standard")}.</p>`),
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
        <td style="padding: 15px 0; border-bottom: 0.5px solid #eee; font-family: serif; font-style: italic; font-size: 14px;">${escapeHtml(item.name)}</td>
        <td align="center" style="padding: 15px 0; border-bottom: 0.5px solid #eee; font-size: 12px; color: #666;">${escapeHtml(item.quantity)}</td>
        <td align="right" style="padding: 15px 0; border-bottom: 0.5px solid #eee; font-size: 13px;">${escapeHtml(item.price)} €</td>
      </tr>
    `).join("");

    const clientContent = `
      <div style="text-align: center; margin-bottom: 40px;">
        <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #999;">Acquisition confirmée</span>
        <h1 style="font-family: serif; font-style: italic; font-weight: normal; font-size: 28px; margin: 10px 0;">Merci pour votre commande.</h1>
        <p style="font-size: 12px; color: #666;">Référence : ${refOrder}</p>
      </div>
      <p style="font-size: 14px;">Bonjour ${escapeHtml(customerName || "Cher client")},</p>
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
        <tr><td style="font-size: 11px; text-transform: uppercase; color: #999;">Livraison</td><td align="right" style="font-size: 13px;">${deliveryFee === 0 ? "Offerte" : escapeHtml(deliveryFee) + " €"}</td></tr>
        <tr><td style="padding-top: 15px; font-size: 11px; text-transform: uppercase; font-weight: bold;">Total</td><td align="right" style="padding-top: 15px; font-size: 22px; font-family: serif; font-style: italic;">${escapeHtml(amount)} €</td></tr>
      </table>
      <div style="background-color: #fafafa; padding: 25px; border-left: 1px solid #000; margin-bottom: 40px;">
        <h4 style="font-size: 9px; text-transform: uppercase; color: #999; margin: 0 0 10px 0;">Détails d'expédition</h4>
        <p style="font-family: serif; font-style: italic; font-size: 14px; color: #333; margin: 0;">${escapeHtml(shippingAddress)}</p>
        <p style="font-size: 12px; color: #666; margin-top: 10px;">Contact : ${escapeHtml(customerPhone || "Non renseigné")}</p>
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
      htmlContent: `<h2>Nouvelle vente</h2><p>Client: ${escapeHtml(customerName)}</p><p>Total: ${escapeHtml(amount)} €</p><p>Tel: ${escapeHtml(customerPhone || "N/A")}</p>`,
    }, {headers: {"api-key": BREVO_API_KEY.value()}});
  } catch (error) {
    console.error("Erreur commande :", error);
  }
});

// 6. PAIEMENT STRIPE
// Le navigateur n'envoie que {productId, quantity} : prix, stock et livraison sont relus en base.
export const createStripeCheckout = onCall({
  secrets: [STRIPE_SECRET_KEY],
}, async (request) => {
  let computation: CheckoutComputation;
  let customerEmail: string | null;
  try {
    const parsed = parseCheckoutRequest(request.data);
    customerEmail = parsed.customerEmail;

    const refs = parsed.items.map((i) => db.collection("produits").doc(i.productId));
    const [productSnaps, deliverySnap] = await Promise.all([
      db.getAll(...refs),
      db.collection("settings").doc("delivery").get(),
    ]);
    const products = new Map<string, CheckoutProduct | undefined>();
    for (const snap of productSnaps) products.set(snap.id, snap.exists ? snap.data() as CheckoutProduct : undefined);

    computation = computeCheckout(parsed.items, products, deliverySnap.data() as DeliverySettings | undefined, {requirePublished: REQUIRE_PUBLISHED});
  } catch (error) {
    if (error instanceof CheckoutError) {
      if (error.code === "invalid_request") throw new HttpsError("invalid-argument", "Panier invalide.");
      throw new HttpsError("failed-precondition", error.code, {code: error.code, productId: error.productId});
    }
    console.error("Erreur préparation paiement :", error);
    throw new HttpsError("internal", "Erreur Stripe.");
  }

  const origin = resolveSiteOrigin(request.rawRequest?.headers?.origin, ALLOWED_ORIGINS.value().split(",").map((o) => o.trim()).filter(Boolean));

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = computation.lines.map((line) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: line.name,
          ...(line.image ? {images: [line.image]} : {}),
          metadata: {productId: line.productId},
        },
        unit_amount: line.unitAmountCents,
      },
      quantity: line.quantity,
    }));

    if (computation.deliveryCents > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {name: "Livraison sécurisée"},
          unit_amount: computation.deliveryCents,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      ...(customerEmail ? {customer_email: customerEmail} : {}),
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
    });
    return {url: session.url, sessionId: session.id, totalCents: computation.totalCents, deliveryCents: computation.deliveryCents};
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

// / ─── TYPES INTERNES POUR LE MATCHING SERVEUR ──────────────────────────────

interface ProductDoc {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  subCategory?: string;
  matieres?: string;
  seo_tags?: string;
  seo_metadata?: {
    intents?: string[];
    invisible_tags?: string;
  };
  price?: number;
  stock?: number;
  status?: string;
  images?: string[];
}

interface IntentJSON {
  query_type: "keyword" | "intent" | "mixed";
  category: string | null;
  sub_category: string | null;
  attributes: string[];
  usage_context: string[];
  constraints: string[];
  confidence: number;
  clarify_if_needed: string | null;
}

interface MatchResult {
  productId: string;
  name: string;
  price: number | null;
  images: string[];
  score: number;
  reasons: string[];
}

// ─── UTILITAIRES ───────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text)
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function canonicalCategory(input: string | null): string | null {
  if (!input) return null;
  const v = normalize(input);
  if (["bebe", "bébé", "enfant", "naissance"].includes(v)) return "Bébé";
  if (["femme", "femmes"].includes(v)) return "Femmes";
  if (["coffret", "coffrets", "cadeau"].includes(v)) return "Coffrets";
  return null;
}

function safeIntent(raw: any): IntentJSON {
  const queryType = ["keyword", "intent", "mixed"].includes(raw?.query_type) ? raw.query_type : "mixed";
  const confidenceRaw = Number(raw?.confidence);
  const confidence = Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(1, confidenceRaw)) : 0.5;

  const category = canonicalCategory(raw?.category ? String(raw.category).trim() : null);
  const subCategory = raw?.sub_category ? String(raw.sub_category).trim() : null;
  const clarify = raw?.clarify_if_needed ? String(raw.clarify_if_needed).trim() : null;

  return {
    query_type: queryType,
    category,
    sub_category: subCategory,
    attributes: asStringArray(raw?.attributes).map((x) => normalize(x)),
    usage_context: asStringArray(raw?.usage_context).map((x) => normalize(x)),
    constraints: asStringArray(raw?.constraints).map((x) => normalize(x)),
    confidence,
    clarify_if_needed: clarify || null,
  };
}

const ATTR_MAP: Record<string, string[]> = {
  impermeable: ["imperm", "pluie", "eau", "deperlant"],
  coupe_vent: ["vent", "coupe-vent"],
  doux: ["doux", "confort", "moelleux", "souple"],
  respirant: ["respirant", "leger", "aere", "ventile"],
  chaud: ["chaud", "hiver", "froid", "laine", "molleton"],
  naturel: ["lin", "coton", "naturel", "bio", "biologique", "chanvre"],
  premium: ["luxe", "premium", "haut de gamme", "noble"],
  cadeau: ["cadeau", "naissance", "offrir", "coffret"],
  artisanal: ["artisan", "fait-main", "brode", "couture", "main"],
  leger: ["leger", "fin", "fluide", "aere"],
};

function scoreProduct(product: ProductDoc, queryTokens: string[], intent: IntentJSON): {score: number; reasons: string[]} {
  const reasons: string[] = [];
  let score = 0;

  const cat = normalize(product.category || "");
  const sub = normalize(product.subCategory || "");
  const mat = normalize(product.matieres || "");
  const desc = normalize(product.description || "");
  const tags = normalize(product.seo_tags || "");
  const intents = normalize((product.seo_metadata?.intents || []).join(" "));
  const invisible = normalize(product.seo_metadata?.invisible_tags || "");

  const longText = [desc, tags, intents, invisible, mat, cat, sub, normalize(product.name || "")]
    .filter(Boolean)
    .join(" ");

  // Correction du bug : utilisation de queryTokens (passé en paramètre) au lieu de Tokens
  const intentHits = queryTokens.filter((t) => intents.includes(t) || invisible.includes(t)).length;
  if (intentHits > 0) {
    score += Math.min(35, intentHits * 9);
    reasons.push(`Intention proche : ${intentHits} signal(aux)`);
  }

  if (intent.category && cat === normalize(intent.category)) {
    score += 24;
    reasons.push(`Catégorie : ${product.category}`);
  }

  if (intent.sub_category && sub === normalize(intent.sub_category)) {
    score += 16;
    reasons.push(`Sous-catégorie : ${product.subCategory}`);
  }

  let attrHits = 0;
  for (const attr of intent.attributes) {
    const probes = ATTR_MAP[attr] || [attr];
    if (probes.some((p) => longText.includes(p))) {
      attrHits += 1;
    }
  }
  if (attrHits > 0) {
    score += Math.min(18, attrHits * 6);
    reasons.push(`Attribut(s) compatible(s) : ${attrHits}`);
  }

  // Correction du bug : utilisation de queryTokens au lieu de Tokens
  const lexHits = queryTokens.filter((t) => longText.includes(t)).length;
  if (lexHits > 0) {
    score += Math.min(10, lexHits * 2);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  if (reasons.length === 0) reasons.push("Alternative la plus proche");

  return {score, reasons: reasons.slice(0, 3)};
}

// 8. RECHERCHE INTELLIGENTE (SMART SEARCH IA)
export const analyzeIntent = onCall({
  secrets: [OPENAI_API_KEY],
}, async (request) => {
  const rawQuery = String(request.data?.query || "").trim();
  if (!rawQuery) {
    throw new HttpsError("invalid-argument", "Requête manquante.");
  }

  const openai = new OpenAI({apiKey: OPENAI_API_KEY.value()});

  const systemPrompt = `
Tu es un parser d'intention e-commerce pour Jaelle & JC.
Tu réponds UNIQUEMENT en JSON valide avec EXACTEMENT ces clés :
{
  "query_type": "keyword" | "intent" | "mixed",
  "category": string | null,
  "sub_category": string | null,
  "attributes": string[],
  "usage_context": string[],
  "constraints": string[],
  "confidence": number,
  "clarify_if_needed": string | null
}
Règles:
- Catégories autorisées: "Bébé", "Femmes", "Coffrets" (sinon null).
- Sous-catégories possibles (exemples): "linges de lit", "accessoires", "vestes".
- Attributes autorisés: impermeable, coupe_vent, doux, respirant, chaud, naturel, premium, cadeau, artisanal, leger.
- Si requête ambiguë, confidence basse (<0.6) et clarify_if_needed non null.
- Aucun texte hors JSON.
`;

  let intent: IntentJSON;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {role: "system", content: systemPrompt},
        {role: "user", content: rawQuery},
      ],
      response_format: {type: "json_object"},
      temperature: 0.1,
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    intent = safeIntent(parsed);

    if (!intent.category) {
      const lowerQuery = normalize(rawQuery);
      if (lowerQuery.includes("bebe") || lowerQuery.includes("bébé") || lowerQuery.includes("naissance") || lowerQuery.includes("bapteme")) {
        intent.category = "Bébé";
      } else if (lowerQuery.includes("coffret")) {
        intent.category = "Coffrets";
      } else if (lowerQuery.includes("femme") || lowerQuery.includes("femmes")) {
        intent.category = "Femmes";
      }
    }

    const lowerQueryForAttr = normalize(rawQuery);
    if ((lowerQueryForAttr.includes("cadeau") || lowerQueryForAttr.includes("naissance") || lowerQueryForAttr.includes("bapteme") || lowerQueryForAttr.includes("offrir")) && !intent.attributes.includes("cadeau")) {
      intent.attributes.push("cadeau");
    }
  } catch (error) {
    console.error("Erreur OpenAI analyzeIntent:", error);
    throw new HttpsError("internal", "Erreur analyse IA.");
  }

  const queryTokens = tokenize(rawQuery);

  let products: ProductDoc[] = [];
  try {
    const snap = await db.collection("produits")
      .where("status", "in", ["published", "draft"])
      .get();

    products = snap.docs
      .map((d) => ({id: d.id, ...d.data()} as ProductDoc))
      .filter((p) => typeof p.stock !== "number" || p.stock > 0);
  } catch (error) {
    console.error("Erreur Firestore catalogue:", error);
    throw new HttpsError("internal", "Erreur lecture catalogue.");
  }

  const results: MatchResult[] = products
    .map((p) => {
      const {score, reasons} = scoreProduct(p, queryTokens, intent);
      return {
        productId: p.id,
        name: p.name || "Sans nom",
        price: typeof p.price === "number" ? p.price : null,
        images: p.images || [],
        score,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const MIN_SCORE = 10;
  const filteredResults = results.filter((r) => r.score >= MIN_SCORE);

  return {intent, results: filteredResults};
});
