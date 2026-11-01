'use client';

import { useState } from 'react';
import { ShoppingBag, AlertCircle } from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';
import type { VariantView } from '@/server/catalog/types';

// Rendu repris de legacy/src/components/products/BuyButton.tsx.
// Ajout au panier serveur : seuls l'identifiant du produit et celui de la variante partent (jamais de prix).
// Une seule fiche par pièce : choix « Coloris » puis « Taille » au-dessus du bouton (une rangée n'apparaît que s'il
// y a plusieurs valeurs) ; pièce unique ou taille unique : aucun choix, ajout direct.
const uniq = (values: string[]) => [...new Set(values.filter(Boolean))];

const BuyButton = ({ productId, variants }: { productId: string; variants: VariantView[] }) => {
  const { add, pending } = useCart();
  const first = variants.find((v) => v.inStock);
  const [color, setColor] = useState(first?.color ?? '');
  const [size, setSize] = useState(first?.size ?? '');
  const baseClass = 'w-full bg-black text-white py-5 flex items-center justify-center gap-3 group hover:bg-neutral-900 transition-all duration-300 disabled:bg-neutral-200 disabled:cursor-not-allowed';

  if (!first) {
    return (
      <button disabled className={baseClass}>
        <AlertCircle size={14} strokeWidth={1} />
        <span className="text-[11px] uppercase tracking-[0.12em]">Épuisé</span>
      </button>
    );
  }

  const colors = uniq(variants.map((v) => v.color));
  const sizes = uniq(variants.map((v) => v.size));
  const available = (c: string, s: string) => variants.some((v) => v.color === c && v.size === s && v.inStock);
  const selected = variants.find((v) => v.color === color && v.size === size && v.inStock);

  // Changement de coloris : taille gardée si elle existe dans ce coloris, sinon première taille disponible.
  const chooseColor = (c: string) => {
    setColor(c);
    if (!available(c, size)) setSize(variants.find((v) => v.color === c && v.inStock)?.size ?? size);
  };

  const option = (value: string, active: boolean, enabled: boolean, onClick: () => void) => (
    <button key={value} type="button" disabled={!enabled} aria-pressed={active} onClick={onClick}
      className={`px-4 py-2 border-[0.5px] text-[11px] uppercase tracking-[0.12em] transition-colors
        disabled:text-neutral-300 disabled:line-through
        ${active ? 'border-black text-black' : 'border-neutral-200 text-neutral-500 hover:border-black'}`}>
      {value}
    </button>
  );

  return (
    <>
      {colors.length > 1 && (
        <fieldset className="mb-6">
          <legend className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 mb-3">Coloris</legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => option(c, c === color, variants.some((v) => v.color === c && v.inStock), () => chooseColor(c)))}
          </div>
        </fieldset>
      )}
      {sizes.length > 1 && (
        <fieldset className="mb-6">
          <legend className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 mb-3">Taille</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => option(s, s === size, available(color, s), () => setSize(s)))}
          </div>
        </fieldset>
      )}
      <button className={baseClass} disabled={pending || !selected} onClick={() => selected && void add(productId, selected.id)}>
        <ShoppingBag size={14} strokeWidth={1} className="group-hover:scale-110 transition-transform duration-300" />
        <span className="text-[11px] uppercase tracking-[0.12em]">Ajouter à la sélection</span>
      </button>
    </>
  );
};

export default BuyButton;
