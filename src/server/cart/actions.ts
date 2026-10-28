'use server';

// Server Actions du panier, appelées par le navigateur. Entrées validées avec Zod : identifiants et quantité
// seulement (aucun prix, nom ni image n'est accepté). Next.js refuse les appels venus d'une autre origine.
import { z } from 'zod';
import { MAX_QUANTITY } from './logic';
import { addToCart, getCartView, updateCartLine } from './service';
import { EMPTY_CART, type CartActionResult, type CartView } from './types';

const docId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const addInput = z.strictObject({ productId: docId, variantId: docId, quantity: z.number().int().min(1).max(MAX_QUANTITY) });
const updateInput = z.strictObject({ productId: docId, variantId: docId, quantity: z.number().int().min(0).max(MAX_QUANTITY) });

async function guarded(action: () => Promise<CartActionResult>): Promise<CartActionResult> {
  try {
    return await action();
  } catch {
    console.error('panier : modification impossible'); // jamais l'entrée ni le cookie dans le journal
    return { cart: await getCartView(), status: 'error' };
  }
}

export async function addToCartAction(input: unknown): Promise<CartActionResult> {
  const parsed = addInput.safeParse(input);
  if (!parsed.success) return { cart: await getCartView(), status: 'error' };
  const { quantity, ...target } = parsed.data;
  return guarded(() => addToCart(target, quantity));
}

export async function updateCartAction(input: unknown): Promise<CartActionResult> {
  const parsed = updateInput.safeParse(input);
  if (!parsed.success) return { cart: await getCartView(), status: 'error' };
  const { quantity, ...target } = parsed.data;
  return guarded(() => updateCartLine(target, quantity));
}

// Relecture (retour sur un onglet resté ouvert : stock ou prix ont pu changer).
export async function readCartAction(): Promise<CartView> {
  try {
    return await getCartView();
  } catch {
    return EMPTY_CART;
  }
}
