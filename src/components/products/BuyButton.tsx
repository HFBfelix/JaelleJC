'use client';

import { useState } from 'react';
import { ShoppingBag, AlertCircle } from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';
import type { VariantView } from '@/server/catalog/types';

// Rendu repris de legacy/src/components/products/BuyButton.tsx.
// Ajout au panier serveur : seuls l'identifiant du produit et celui de la variante partent (jamais de prix).
// Plusieurs variantes actives (coloris × taille) : choix au-dessus du bouton ; une seule : ajout direct.
const BuyButton = ({ productId, variants }: { productId: string; variants: VariantView[] }) => {
  const { add, pending } = useCart();
  const [selected, setSelected] = useState(() => variants.find((v) => v.inStock)?.id ?? null);
  const baseClass = 'w-full bg-black text-white py-5 flex items-center justify-center gap-3 group hover:bg-neutral-900 transition-all duration-300 disabled:bg-neutral-200 disabled:cursor-not-allowed';

  if (!selected) {
    return (
      <button disabled className={baseClass}>
        <AlertCircle size={14} strokeWidth={1} />
        <span className="text-[11px] uppercase tracking-[0.12em]">Épuisé</span>
      </button>
    );
  }

  return (
    <>
      {variants.length > 1 && (
        <fieldset className="mb-6">
          <legend className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 mb-3">Modèle</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button key={v.id} type="button" disabled={!v.inStock} aria-pressed={selected === v.id}
                onClick={() => setSelected(v.id)}
                className={`px-4 py-2 border-[0.5px] text-[11px] uppercase tracking-[0.12em] transition-colors
                  disabled:text-neutral-300 disabled:line-through
                  ${selected === v.id ? 'border-black text-black' : 'border-neutral-200 text-neutral-500 hover:border-black'}`}>
                {v.label || 'Unique'}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <button className={baseClass} disabled={pending} onClick={() => void add(productId, selected)}>
        <ShoppingBag size={14} strokeWidth={1} className="group-hover:scale-110 transition-transform duration-300" />
        <span className="text-[11px] uppercase tracking-[0.12em]">Ajouter à la sélection</span>
      </button>
    </>
  );
};

export default BuyButton;
