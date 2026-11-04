'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, AlertCircle } from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';
import {
  chooseColor, colorAvailable, colorsOf, initialChoice, missingMessage, missingOf, selectedVariant, sizeAvailable, sizesOf, type Missing,
} from '@/server/catalog/choice';
import type { OtherColorView, VariantView } from '@/server/catalog/types';

// Rendu repris de legacy/src/components/products/BuyButton.tsx.
// Ajout au panier serveur : seuls l'identifiant du produit et celui de la variante partent (jamais de prix).
// Une fiche par couleur (décision de Jaelle, 2026-11-04) : « Couleur » montre la couleur de la fiche et celles des
// autres fiches du même modèle (pastilles qui mènent à leur fiche, taille choisie gardée), puis « Taille ».
// Rien n'est choisi à la place de la cliente, sauf une possibilité unique (choice.ts) ; tant qu'il manque un choix,
// rien ne part au panier. Ce qui n'est plus en stock est barré ; pièce sans coloris ni taille : ajout direct.
const NO_HEX = '#e5e5e5'; // teinte pas encore choisie par la créatrice
const swatch = 'relative block w-8 h-8 rounded-full border-[0.5px] border-neutral-300 disabled:pointer-events-none';
const swatchHover = 'hover:outline hover:outline-[0.5px] hover:outline-neutral-400 hover:outline-offset-2';

type Props = { productId: string; variants: VariantView[]; otherColors?: OtherColorView[]; wantedSize?: string };

const SoldOutMark = ({ wide = false }: { wide?: boolean }) => (
  wide
    ? <span aria-hidden className="absolute left-1/2 top-1/2 w-[150%] h-[2px] bg-black -translate-x-1/2 -translate-y-1/2 -rotate-[24deg]" />
    : <span aria-hidden className="absolute left-1/2 top-1/2 w-[120%] h-[2px] bg-black shadow-[0_0_0_1px_#fff] -translate-x-1/2 -translate-y-1/2 -rotate-45" />
);
const SoldOutTip = () => (
  <span aria-hidden className="pointer-events-none absolute left-1/2 bottom-full mb-1 -translate-x-1/2 whitespace-nowrap bg-black text-white px-2 py-1 text-[11px] uppercase tracking-[0.12em] opacity-0 group-hover:opacity-100 transition-opacity">
    Épuisé
  </span>
);
const Hint = ({ children }: { children: string }) => <p role="alert" className="text-[13px] text-black mt-3">{children}</p>;

const BuyButton = ({ productId, variants, otherColors = [], wantedSize = '' }: Props) => {
  const { add, pending } = useCart();
  const [start] = useState(() => initialChoice(variants, wantedSize));
  const [choice, setChoice] = useState({ color: start.color, size: start.size });
  const [notice, setNotice] = useState<string | null>(start.notice);
  const [missing, setMissing] = useState<Missing[]>([]);
  const colorRef = useRef<HTMLFieldSetElement>(null);
  const sizeRef = useRef<HTMLFieldSetElement>(null);
  const baseClass = 'w-full bg-black text-white py-5 flex items-center justify-center gap-3 group hover:bg-neutral-900 transition-all duration-300 disabled:bg-neutral-200 disabled:cursor-not-allowed';

  if (!variants.some((v) => v.inStock)) {
    return (
      <button disabled className={baseClass}>
        <AlertCircle size={14} strokeWidth={1} />
        <span className="text-[11px] uppercase tracking-[0.12em]">Épuisé</span>
      </button>
    );
  }

  const colors = colorsOf(variants);
  const sizes = sizesOf(variants);
  const hexOf = (c: string) => variants.find((v) => v.color === c && v.colorHex)?.colorHex ?? NO_HEX;
  // Pastilles : couleurs de cette fiche et des autres fiches du modèle, dans l'ordre alphabétique (mêmes places
  // d'une fiche à l'autre).
  const swatches = [
    ...colors.map((name) => ({ name, other: null })),
    ...otherColors.map((o) => ({ name: o.name, other: o })),
  ].sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  const pickColor = (c: string) => {
    const next = chooseColor(variants, choice, c);
    setChoice({ color: next.color, size: next.size });
    setNotice(next.notice);
    setMissing((m) => m.filter((x) => x !== 'couleur'));
  };
  const pickSize = (s: string) => {
    setChoice({ ...choice, size: s });
    setNotice(null);
    setMissing((m) => m.filter((x) => x !== 'taille'));
  };

  const onAdd = () => {
    const lacking = missingOf(variants, choice);
    if (lacking.length) {
      setMissing(lacking);
      setNotice(null);
      (lacking[0] === 'couleur' ? colorRef : sizeRef).current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const variant = selectedVariant(variants, choice);
    if (variant) void add(productId, variant.id);
  };

  return (
    <>
      {swatches.length > 0 && (
        <fieldset ref={colorRef} className="mb-6" aria-label="Couleur">
          <legend className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 mb-3">
            Couleur{choice.color && <> : <span className="text-black">{choice.color}</span></>}
          </legend>
          <div className="flex flex-wrap gap-3">
            {swatches.map(({ name, other }) => {
              if (other) {
                // Autre couleur du modèle : lien vers sa fiche (ses photos), taille choisie gardée.
                const href = `/produits/${other.slug}${choice.size ? `?taille=${encodeURIComponent(choice.size)}` : ''}`;
                return (
                  <span key={`autre-${name}`} className="relative group" title={other.inStock ? name : 'Épuisé'}>
                    {other.inStock
                      ? <Link href={href} aria-label={name} className={`${swatch} ${swatchHover}`} style={{ backgroundColor: other.hex ?? NO_HEX }} />
                      : (
                        <span role="img" aria-label={`${name} (épuisé)`} className={swatch} style={{ backgroundColor: other.hex ?? NO_HEX }}>
                          <SoldOutMark />
                        </span>
                      )}
                    {!other.inStock && <SoldOutTip />}
                  </span>
                );
              }
              const enabled = colorAvailable(variants, name);
              // Épuisée : même traitement que les tailles (trait noir épais, liseré blanc pour les teintes foncées,
              // « Épuisé » au survol porté par l'enveloppe).
              return (
                <span key={name} className="relative group" title={enabled ? name : 'Épuisé'}>
                  <button type="button" disabled={!enabled} aria-pressed={name === choice.color} aria-label={enabled ? name : `${name} (épuisé)`}
                    onClick={() => pickColor(name)}
                    className={`${swatch} ${name === choice.color ? 'outline outline-[0.5px] outline-black outline-offset-2' : swatchHover}`}
                    style={{ backgroundColor: hexOf(name) }}>
                    {!enabled && <SoldOutMark />}
                  </button>
                  {!enabled && <SoldOutTip />}
                </span>
              );
            })}
          </div>
          {missing.includes('couleur') && <Hint>{missingMessage(missing)}</Hint>}
        </fieldset>
      )}
      {sizes.length > 0 && (
        <fieldset ref={sizeRef} className="mb-6">
          <legend className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 mb-3">
            Taille{choice.size && <> : <span className="text-black">{choice.size}</span></>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const soldOut = !sizeAvailable(variants, choice.color, s);
              // Épuisée : case barrée d'un trait noir épais en diagonale, « Épuisé » au survol (bouton inactif : le survol
              // est porté par l'enveloppe).
              return (
                <span key={s} className="relative group" title={soldOut ? 'Épuisé' : undefined}>
                  <button type="button" disabled={soldOut} aria-pressed={s === choice.size} onClick={() => pickSize(s)}
                    aria-label={soldOut ? `${s} (épuisé)` : s}
                    className={`relative overflow-hidden px-4 py-2 border-[0.5px] text-[11px] uppercase tracking-[0.12em] transition-colors
                      disabled:text-neutral-400 disabled:pointer-events-none
                      ${s === choice.size ? 'border-black text-black' : 'border-neutral-200 text-neutral-500 hover:border-black'}`}>
                    {s}
                    {soldOut && <SoldOutMark wide />}
                  </button>
                  {soldOut && <SoldOutTip />}
                </span>
              );
            })}
          </div>
          {notice && <Hint>{notice}</Hint>}
          {missing.includes('taille') && !missing.includes('couleur') && <Hint>{missingMessage(missing)}</Hint>}
        </fieldset>
      )}
      <button className={baseClass} disabled={pending} onClick={onAdd}>
        <ShoppingBag size={14} strokeWidth={1} className="group-hover:scale-110 transition-transform duration-300" />
        <span className="text-[11px] uppercase tracking-[0.12em]">Ajouter à la sélection</span>
      </button>
    </>
  );
};

export default BuyButton;
