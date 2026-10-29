// Panier courant : celui du compte si une session est ouverte (`carts/u_{uid}`), sinon celui du visiteur
// (cookie `cart_token` → empreinte → document). Appelé par les pages (lecture) et par les Server Actions
// (modification), jamais par un composant client.
import 'server-only';
import { cookies, headers } from 'next/headers';
import { getSessionUser } from '../auth/session';
import { addQuantity, priceCart, updateExisting } from './logic';
import { accountKey, changeCart, guestKey, loadCart, mergeGuestCart, readDeliveryRule, type CartKey } from './repository';
import { CART_COOKIE, cartCookieOptions, hashToken, isValidToken, newToken } from './token';
import { EMPTY_CART, type CartActionResult, type CartView } from './types';

type Target = { productId: string; variantId: string };

async function guestHash(): Promise<string | null> {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  return isValidToken(token) ? hashToken(token) : null;
}

async function currentKey(): Promise<CartKey | null> {
  const user = await getSessionUser();
  if (user) return accountKey(user.uid);
  const hash = await guestHash();
  return hash ? guestKey(hash) : null;
}

export async function getCartView(): Promise<CartView> {
  try {
    const key = await currentKey();
    if (!key) return EMPTY_CART;
    const [{ items, offers, adjusted }, rule] = await Promise.all([loadCart(key), readDeliveryRule()]);
    return priceCart(items, offers, rule, adjusted);
  } catch {
    // Le site reste consultable si la base ne répond pas ; aucune donnée personnelle dans le journal.
    console.error('panier : lecture impossible');
    return EMPTY_CART;
  }
}

async function run(key: CartKey, target: Target, apply: Parameters<typeof changeCart>[2]): Promise<CartActionResult> {
  const [{ items, offers, status, adjusted }, rule] = await Promise.all([changeCart(key, target, apply), readDeliveryRule()]);
  return { cart: priceCart(items, offers, rule, adjusted), status };
}

// Ajout : pour un visiteur, le cookie n'est posé que si une pièce est réellement entrée dans le panier.
export async function addToCart(target: Target, quantity: number): Promise<CartActionResult> {
  const existing = await currentKey();
  const token = existing ? null : newToken();
  const key = existing ?? guestKey(hashToken(token!));
  const result = await run(key, target, (items, offer) => addQuantity(items, target, quantity, offer));
  if (token && result.cart.lines.length) {
    (await cookies()).set(CART_COOKIE, token, cartCookieOptions((await headers()).get('host')));
  }
  return result;
}

export async function updateCartLine(target: Target, quantity: number): Promise<CartActionResult> {
  const key = await currentKey();
  if (!key) return { cart: EMPTY_CART, status: 'removed' };
  return run(key, target, (items, offer) => updateExisting(items, target, quantity, offer));
}

// Juste après l'ouverture de la session : panier visiteur ajouté au compte, cookie du panier retiré.
export async function attachGuestCart(uid: string) {
  const hash = await guestHash();
  (await cookies()).delete(CART_COOKIE);
  if (hash) await mergeGuestCart(guestKey(hash), accountKey(uid));
}
