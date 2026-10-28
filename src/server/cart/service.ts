// Panier du visiteur courant : cookie `cart_token` (HttpOnly, Secure, SameSite=Lax) → empreinte → document.
// Appelé par les pages (lecture) et par les Server Actions (modification), jamais par un composant client.
import 'server-only';
import { cookies, headers } from 'next/headers';
import { addQuantity, priceCart, updateExisting } from './logic';
import { changeCart, loadCart, readDeliveryRule } from './repository';
import { CART_COOKIE, cartCookieOptions, hashToken, isValidToken, newToken } from './token';
import { EMPTY_CART, type CartActionResult, type CartView } from './types';

type Target = { productId: string; variantId: string };

async function currentHash(): Promise<string | null> {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  return isValidToken(token) ? hashToken(token) : null;
}

export async function getCartView(): Promise<CartView> {
  const hash = await currentHash();
  if (!hash) return EMPTY_CART;
  try {
    const [{ items, offers, adjusted }, rule] = await Promise.all([loadCart(hash), readDeliveryRule()]);
    return priceCart(items, offers, rule, adjusted);
  } catch {
    // Le site reste consultable si la base ne répond pas ; aucune donnée personnelle dans le journal.
    console.error('panier : lecture impossible');
    return EMPTY_CART;
  }
}

async function run(hash: string, target: Target, apply: Parameters<typeof changeCart>[2]): Promise<CartActionResult> {
  const [{ items, offers, status, adjusted }, rule] = await Promise.all([changeCart(hash, target, apply), readDeliveryRule()]);
  return { cart: priceCart(items, offers, rule, adjusted), status };
}

// Ajout : le cookie n'est posé que si une pièce est réellement entrée dans le panier.
export async function addToCart(target: Target, quantity: number): Promise<CartActionResult> {
  const existing = await currentHash();
  const token = existing ? null : newToken();
  const hash = existing ?? hashToken(token!);
  const result = await run(hash, target, (items, offer) => addQuantity(items, target, quantity, offer));
  if (token && result.cart.lines.length) {
    (await cookies()).set(CART_COOKIE, token, cartCookieOptions((await headers()).get('host')));
  }
  return result;
}

export async function updateCartLine(target: Target, quantity: number): Promise<CartActionResult> {
  const hash = await currentHash();
  if (!hash) return { cart: EMPTY_CART, status: 'removed' };
  return run(hash, target, (items, offer) => updateExisting(items, target, quantity, offer));
}
