/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
import {test} from "node:test";
import assert from "node:assert/strict";
import {CheckoutError, CheckoutProduct, computeCheckout, eurosToCents, parseCheckoutRequest, resolveSiteOrigin} from "./checkout";

const product = (over: Partial<CheckoutProduct> = {}): CheckoutProduct => ({
  name: "Cape de bain", price: 89.9, stock: 3, status: "published", images: ["https://firebasestorage.googleapis.com/x.jpg"], ...over,
});
const catalog = (entries: Record<string, CheckoutProduct | undefined>) => new Map(Object.entries(entries));
const strict = {requirePublished: true};
const legacy = {requirePublished: false};

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof CheckoutError ? e.code : "other";
  }
  return undefined;
}

// --- Prix : le serveur ignore tout prix envoyé par le navigateur ---

test("un prix modifié dans le navigateur ne change pas le montant", () => {
  const req = parseCheckoutRequest({cartItems: [{productId: "cape", quantity: 1, price: 0.01, name: "PIRATE"}]});
  const result = computeCheckout(req.items, catalog({cape: product()}), {flatRate: 6.9, freeThreshold: 150}, strict);
  assert.equal(result.lines[0].unitAmountCents, 8990);
  assert.equal(result.lines[0].name, "Cape de bain");
  assert.equal(result.totalCents, 8990 + 690);
});

test("la livraison est relue côté serveur, gratuite au-delà du seuil", () => {
  const req = parseCheckoutRequest({cartItems: [{productId: "cape", quantity: 2}], deliveryFee: 0});
  const result = computeCheckout(req.items, catalog({cape: product()}), {flatRate: 6.9, freeThreshold: 150}, strict);
  assert.equal(result.subtotalCents, 17980);
  assert.equal(result.deliveryCents, 0);
  const small = computeCheckout(parseCheckoutRequest({cartItems: [{productId: "cape", quantity: 1}], deliveryFee: 0}).items, catalog({cape: product()}), {flatRate: 6.9, freeThreshold: 150}, strict);
  assert.equal(small.deliveryCents, 690);
});

test("calculs en centimes entiers, sans erreur d'arrondi", () => {
  assert.equal(eurosToCents(0.1 + 0.2), 30);
  assert.equal(eurosToCents(19.99), 1999);
  assert.equal(eurosToCents(-1), null);
  assert.equal(eurosToCents("12"), null);
  assert.equal(eurosToCents(Number.NaN), null);
});

// --- Quantités et entrées malformées ---

for (const [label, data] of [
  ["quantité négative", {cartItems: [{productId: "cape", quantity: -1}]}],
  ["quantité nulle", {cartItems: [{productId: "cape", quantity: 0}]}],
  ["quantité décimale", {cartItems: [{productId: "cape", quantity: 1.5}]}],
  ["quantité énorme", {cartItems: [{productId: "cape", quantity: 1e9}]}],
  ["quantité en texte", {cartItems: [{productId: "cape", quantity: "2"}]}],
  ["identifiant avec chemin", {cartItems: [{productId: "../orders/x", quantity: 1}]}],
  ["identifiant HTML", {cartItems: [{productId: "<script>", quantity: 1}]}],
  ["identifiant trop long", {cartItems: [{productId: "a".repeat(200), quantity: 1}]}],
  ["panier vide", {cartItems: []}],
  ["panier absent", {}],
  ["requête nulle", null],
  ["trop de lignes", {cartItems: Array.from({length: 31}, (_, i) => ({productId: `p${i}`, quantity: 1}))}],
  ["doublons dépassant le plafond", {cartItems: [{productId: "cape", quantity: 15}, {productId: "cape", quantity: 15}]}],
] as const) {
  test(`entrée refusée : ${label}`, () => {
    assert.equal(codeOf(() => parseCheckoutRequest(data)), "invalid_request");
  });
}

test("les doublons sont regroupés", () => {
  const req = parseCheckoutRequest({cartItems: [{productId: "cape", quantity: 1}, {productId: "cape", quantity: 2}]});
  assert.deepEqual(req.items, [{productId: "cape", quantity: 3}]);
});

test("un e-mail invalide n'est pas transmis à Stripe", () => {
  assert.equal(parseCheckoutRequest({cartItems: [{productId: "a", quantity: 1}], customerEmail: "<b>x</b>"}).customerEmail, null);
  assert.equal(parseCheckoutRequest({cartItems: [{productId: "a", quantity: 1}], customerEmail: " jaelle@exemple.fr "}).customerEmail, "jaelle@exemple.fr");
});

// --- Stock et disponibilité ---

test("stock insuffisant refusé", () => {
  const items = parseCheckoutRequest({cartItems: [{productId: "cape", quantity: 4}]}).items;
  assert.equal(codeOf(() => computeCheckout(items, catalog({cape: product({stock: 3})}), {}, strict)), "out_of_stock");
});

test("stock absent ou invalide refusé (pas de survente)", () => {
  const items = parseCheckoutRequest({cartItems: [{productId: "cape", quantity: 1}]}).items;
  for (const stock of [undefined, null, Number.NaN, "5", 0, -2]) {
    assert.equal(codeOf(() => computeCheckout(items, catalog({cape: product({stock})}), {}, strict)), "out_of_stock", `stock=${String(stock)}`);
  }
});

test("produit inexistant refusé", () => {
  const items = parseCheckoutRequest({cartItems: [{productId: "fantome", quantity: 1}]}).items;
  assert.equal(codeOf(() => computeCheckout(items, catalog({fantome: undefined}), {}, strict)), "unavailable");
});

test("prix absent, nul ou négatif refusé", () => {
  const items = parseCheckoutRequest({cartItems: [{productId: "cape", quantity: 1}]}).items;
  for (const price of [undefined, 0, -5, "89"]) {
    assert.equal(codeOf(() => computeCheckout(items, catalog({cape: product({price})}), {}, strict)), "unavailable", `price=${String(price)}`);
  }
});

test("produit archivé toujours refusé", () => {
  const items = parseCheckoutRequest({cartItems: [{productId: "cape", quantity: 1}]}).items;
  assert.equal(codeOf(() => computeCheckout(items, catalog({cape: product({status: "archived"})}), {}, legacy)), "unavailable");
});

test("brouillon : refusé en mode strict, accepté en mode transition (livraison A)", () => {
  const items = parseCheckoutRequest({cartItems: [{productId: "cape", quantity: 1}]}).items;
  assert.equal(codeOf(() => computeCheckout(items, catalog({cape: product({status: "draft"})}), {}, strict)), "unavailable");
  assert.equal(computeCheckout(items, catalog({cape: product({status: "draft"})}), {}, legacy).totalCents, 8990);
});

test("image non https ignorée", () => {
  const items = parseCheckoutRequest({cartItems: [{productId: "cape", quantity: 1}]}).items;
  const r = computeCheckout(items, catalog({cape: product({images: ["javascript:alert(1)"]})}), {}, strict);
  assert.equal(r.lines[0].image, null);
});

// --- Adresse de retour ---

test("adresse de retour : seules les origines autorisées sont acceptées", () => {
  const allowed = ["https://jaellejc.com", "https://www.jaellejc.com"];
  assert.equal(resolveSiteOrigin("https://www.jaellejc.com", allowed), "https://www.jaellejc.com");
  assert.equal(resolveSiteOrigin("https://pirate.example", allowed), "https://jaellejc.com");
  assert.equal(resolveSiteOrigin(undefined, allowed), "https://jaellejc.com");
});
