'use client';

import { useState } from 'react';
import { ShoppingBag, AlertCircle } from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';
import { sizeRank } from '@/server/catalog/sizes';
import type { VariantView } from '@/server/catalog/types';

// Rendu repris de legacy/src/components/products/BuyButton.tsx.
// Ajout au panier serveur : seuls l'identifiant du produit et celui de la variante partent (jamais de prix).
// Une seule fiche par pièce : « Couleur » (pastilles de la teinte choisie par la créatrice) puis « Taille » (ordre
// de la grille). Ce qui n'est plus en stock est barré ; pièce sans coloris ni taille : aucun choix, ajout direct.
const uniq = (values: string[]) => [...new Set(values.filter(Boolean))];
const NO_HEX = '#e5e5e5'; // teinte pas encore choisie par la créatrice

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
  const sizes = uniq(variants.map((v) => v.size)).sort((a, b) => sizeRank(a) - sizeRank(b));
  const hexOf = (c: string) => variants.find((v) => v.color === c && v.colorHex)?.colorHex ?? NO_HEX;
  const available = (c: string, s: string) => variants.some((v) => v.color === c && v.size === s && v.inStock);
  const selected = variants.find((v) => v.color === color && v.size === size && v.inStock);

  // Changement de couleur : taille gardée si elle reste en stock dans cette couleur, sinon première disponible.
  const chooseColor = (c: string) => {
    setColor(c);
    if (!available(c, size)) setSize(sizes.find((s) => available(c, s)) ?? size);
  };

  return (
    <>
      {colors.length > 0 && (
        <fieldset className="mb-6" aria-label="Couleur">
          <legend className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 mb-3">
            Couleur : <span className="text-black">{color}</span>
          </legend>
          <div className="flex flex-wrap gap-3">
            {colors.map((c) => {
              const enabled = variants.some((v) => v.color === c && v.inStock);
              return (
                <button key={c} type="button" disabled={!enabled} aria-pressed={c === color} aria-label={c} title={c}
                  onClick={() => chooseColor(c)}
                  className={`relative w-8 h-8 rounded-full border-[0.5px] border-neutral-300 disabled:cursor-not-allowed
                    ${c === color ? 'outline outline-[0.5px] outline-black outline-offset-2' : 'hover:outline hover:outline-[0.5px] hover:outline-neutral-400 hover:outline-offset-2'}`}
                  style={{ backgroundColor: hexOf(c) }}>
                  {!enabled && <span aria-hidden className="absolute left-1/2 top-1/2 w-[130%] h-px bg-neutral-500 -translate-x-1/2 -translate-y-1/2 -rotate-45" />}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      {sizes.length > 0 && (
        <fieldset className="mb-6">
          <legend className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 mb-3">Taille</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const soldOut = !available(color, s);
              // Épuisée : case barrée d'un trait noir épais en diagonale, « Épuisé » au survol (bouton inactif : le survol
              // est porté par l'enveloppe).
              return (
                <span key={s} className="relative group" title={soldOut ? 'Épuisé' : undefined}>
                  <button type="button" disabled={soldOut} aria-pressed={s === size} onClick={() => setSize(s)}
                    aria-label={soldOut ? `${s} (épuisé)` : s}
                    className={`relative overflow-hidden px-4 py-2 border-[0.5px] text-[11px] uppercase tracking-[0.12em] transition-colors
                      disabled:text-neutral-400 disabled:pointer-events-none
                      ${s === size ? 'border-black text-black' : 'border-neutral-200 text-neutral-500 hover:border-black'}`}>
                    {s}
                    {soldOut && <span aria-hidden className="absolute left-1/2 top-1/2 w-[150%] h-[2px] bg-black -translate-x-1/2 -translate-y-1/2 -rotate-[24deg]" />}
                  </button>
                  {soldOut && (
                    <span aria-hidden className="pointer-events-none absolute left-1/2 bottom-full mb-1 -translate-x-1/2 whitespace-nowrap bg-black text-white px-2 py-1 text-[11px] uppercase tracking-[0.12em] opacity-0 group-hover:opacity-100 transition-opacity">
                      Épuisé
                    </span>
                  )}
                </span>
              );
            })}
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
