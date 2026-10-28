'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { addToCartAction, readCartAction, updateCartAction } from '@/server/cart/actions';
import type { CartActionResult, CartLineView, CartStatus, CartView } from '@/server/cart/types';

// Panier affiché : la vérité vient du serveur (`initialCart`, puis réponse de chaque action).
// Le badge bouge tout de suite (interface optimiste), puis la réponse du serveur remplace l'estimation.
type CartContextValue = {
  cart: CartView;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  pending: boolean;
  notice: string | null;
  add: (productId: string, variantId: string) => Promise<void>;
  update: (line: CartLineView, quantity: number) => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

// Microtextes : EDITORIAL.md §5.
const STOCK_NOTICE = 'Cette pièce vient de trouver preneur. Elle a été retirée de votre sélection.';
const NOTICES: Partial<Record<CartStatus, string>> = {
  added: 'Ajouté à votre sélection',
  capped: 'Quantité limitée par le stock disponible.',
  unavailable: STOCK_NOTICE,
  full: 'Votre sélection a atteint le nombre maximal de pièces.',
  error: 'Une erreur est survenue. Réessayez dans un instant.',
};

const noticeFor = ({ cart, status }: CartActionResult) =>
  NOTICES[status] ?? (cart.adjusted ? STOCK_NOTICE : null);

export function CartProvider({ initialCart, children }: { initialCart: CartView; children: ReactNode }) {
  const [cart, setCart] = useState(initialCart);
  const [seen, setSeen] = useState(initialCart);
  const [isOpen, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(initialCart.adjusted ? STOCK_NOTICE : null);

  // Nouveau rendu serveur (navigation, cookie posé par une action) : il fait foi.
  if (initialCart !== seen) {
    setSeen(initialCart);
    setCart(initialCart);
  }

  // Onglet resté ouvert : prix et stock ont pu changer, relecture au retour.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void readCartAction().then(setCart);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const apply = useCallback(async (call: () => Promise<CartActionResult>) => {
    setPending(true);
    try {
      const result = await call();
      setCart(result.cart);
      setNotice(noticeFor(result));
    } catch {
      setNotice(NOTICES.error!);
      setCart(await readCartAction().catch(() => initialCart));
    } finally {
      setPending(false);
    }
  }, [initialCart]);

  const add = useCallback(async (productId: string, variantId: string) => {
    setCart((c) => ({ ...c, count: c.count + 1 }));
    setOpen(true); // comportement actuel : le tiroir s'ouvre, la cliente continue ses achats
    await apply(() => addToCartAction({ productId, variantId, quantity: 1 }));
  }, [apply]);

  const update = useCallback(async (line: CartLineView, quantity: number) => {
    setCart((c) => ({
      ...c,
      count: c.count - line.quantity + quantity,
      lines: quantity > 0
        ? c.lines.map((l) => (l.productId === line.productId && l.variantId === line.variantId ? { ...l, quantity } : l))
        : c.lines.filter((l) => !(l.productId === line.productId && l.variantId === line.variantId)),
    }));
    await apply(() => updateCartAction({ productId: line.productId, variantId: line.variantId, quantity }));
  }, [apply]);

  const setOpenAndClear = useCallback((open: boolean) => {
    setOpen(open);
    if (!open) setNotice(null);
  }, []);

  return (
    <CartContext.Provider value={{ cart, isOpen, setOpen: setOpenAndClear, pending, notice, add, update }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart : CartProvider manquant');
  return value;
}
