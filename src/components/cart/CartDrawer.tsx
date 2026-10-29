'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { CartLines, CartTotals, DeliveryProgress, EmptyCart, PayButton } from './CartLines';
import { useCart } from './CartProvider';

// Tiroir « Votre sélection » : rendu repris de legacy/src/components/cart/CartDrawer.tsx.
// S'ouvre à chaque ajout ; la cliente continue ses achats (comportement actuel conservé).
const CartDrawer = () => {
  const { cart, isOpen, setOpen, notice, pending } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, setOpen]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-[200] transition-opacity duration-500
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={close}
        aria-hidden="true"
      />

      <aside
        role="dialog" aria-modal="true" aria-label="Votre sélection"
        aria-hidden={!isOpen} inert={!isOpen}
        className={`fixed top-0 right-0 h-full w-full md:w-[450px] bg-white z-[201]
          transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          <div className="h-[65px] px-8 flex items-center justify-between border-b-[0.5px] border-neutral-100">
            <span className="text-[11px] uppercase tracking-[0.12em]">Votre sélection ({cart.count})</span>
            <button ref={closeRef} onClick={close} aria-label="Fermer la sélection" className="hover:rotate-90 transition-transform duration-300">
              <X size={20} strokeWidth={1} />
            </button>
          </div>

          <p role="status" className={notice ? 'px-8 py-3 border-b-[0.5px] border-neutral-100 text-[11px] uppercase tracking-[0.12em]' : 'sr-only'}>
            {notice}
          </p>

          <DeliveryProgress cart={cart} />

          <div className="flex-grow overflow-y-auto px-8 py-10">
            {cart.lines.length ? <CartLines onNavigate={close} /> : !pending && <EmptyCart onNavigate={close} />}
          </div>

          {cart.lines.length > 0 && (
            <div className="p-8 border-t-[0.5px] border-neutral-100">
              <CartTotals cart={cart} />
              <PayButton onNavigate={close} />
              <Link href="/panier" onClick={close}
                className="block text-center text-[11px] uppercase tracking-[0.12em] text-neutral-500 hover:text-black mt-4">
                Voir le détail
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default CartDrawer;
