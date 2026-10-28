'use client';

import { ShoppingBag, AlertCircle } from 'lucide-react';

// Rendu repris de legacy/src/components/products/BuyButton.tsx.
// Étape 2 : affichage seulement (disponibilité lue côté serveur). L'ajout au panier serveur arrive à l'étape 3.
const BuyButton = ({ inStock }: { inStock: boolean }) => {
  const baseClass = 'w-full bg-black text-white py-5 flex items-center justify-center gap-3 group hover:bg-neutral-900 transition-all duration-300 disabled:bg-neutral-200 disabled:cursor-not-allowed';

  if (!inStock) {
    return (
      <button disabled className={baseClass}>
        <AlertCircle size={14} strokeWidth={1} />
        <span className="text-[10px] uppercase tracking-[0.4em]">Épuisé</span>
      </button>
    );
  }

  return (
    <button className={baseClass}>
      <ShoppingBag size={14} strokeWidth={1} className="group-hover:scale-110 transition-transform duration-300" />
      <span className="text-[10px] uppercase tracking-[0.4em]">Ajouter à la sélection</span>
    </button>
  );
};

export default BuyButton;
