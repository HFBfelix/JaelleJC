'use client';

import { CartLines, CartTotals, DeliveryProgress, EmptyCart, PayButton } from './CartLines';
import { useCart } from './CartProvider';

// Page /panier : mêmes lignes et totaux que le tiroir, sur toute la largeur.
const CartPageView = () => {
  const { cart, notice } = useCart();
  return (
    <div className="max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-24">
      <h1 className="font-serif text-3xl md:text-4xl mb-12">Votre sélection</h1>
      <p role="status" className={notice ? 'mb-8 text-[11px] uppercase tracking-[0.12em]' : 'sr-only'}>{notice}</p>
      {cart.lines.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="grid md:grid-cols-[1fr_360px] gap-12 md:gap-16 items-start">
          <CartLines />
          <div className="border-[0.5px] border-neutral-100">
            <DeliveryProgress cart={cart} />
            <div className="p-8">
              <CartTotals cart={cart} />
              <PayButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPageView;
