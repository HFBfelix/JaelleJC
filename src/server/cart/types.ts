// Vues du panier transmises au navigateur. Le prix vient toujours du serveur (relu en base à chaque calcul) :
// le navigateur ne l'envoie jamais. Le stock n'est pas transmis (seulement « peut augmenter ») ; il reste
// déductible en demandant 99 pièces (quantité plafonnée), ce qui est inhérent au plafond au stock.
export type CartItem = { productId: string; variantId: string; quantity: number };

// Ce que le serveur sait d'une variante vendable (produit publié, variante active), lu en base.
export type Offer = {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  variantLabel: string;
  categoryName: string;
  image: { url: string; alt: string } | null;
  unitPriceCents: number;
  stock: number;
};

export type CartLineView = {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  variantLabel: string;
  categoryName: string;
  image: { url: string; alt: string } | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  canIncrease: boolean;
};

// free : livraison offerte ; flat : forfait ; unknown : réglage absent, montant calculé au paiement.
export type DeliveryView = { kind: 'free' | 'flat' | 'unknown'; cents: number; freeThresholdCents: number; remainingCents: number };

export type CartView = {
  lines: CartLineView[];
  count: number;
  subtotalCents: number;
  delivery: DeliveryView;
  totalCents: number;
  // Vrai si la base a retiré une pièce ou réduit une quantité (pièce vendue entre-temps, retirée de la vente).
  adjusted: boolean;
};

// Résultat d'une action : `removed` = ligne retirée à la demande ; `unavailable` = pièce visée plus en vente
// ou épuisée ; `capped` = quantité limitée par le stock ;
// `full` = nombre maximal de lignes atteint ; `error` = action impossible (base indisponible, saisie invalide).
export type CartStatus = 'added' | 'updated' | 'removed' | 'capped' | 'unavailable' | 'full' | 'error';

export type CartActionResult = { cart: CartView; status: CartStatus };

export const EMPTY_CART: CartView = {
  lines: [],
  count: 0,
  subtotalCents: 0,
  delivery: { kind: 'unknown', cents: 0, freeThresholdCents: 0, remainingCents: 0 },
  totalCents: 0,
  adjusted: false,
};
