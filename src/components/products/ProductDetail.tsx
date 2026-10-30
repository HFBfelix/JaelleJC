import type { ReactNode } from 'react';
import Image from 'next/image';
import { BackButton, MobileGallery } from './ProductGallery';
import { ProductAccordions, ProductQuote } from './ProductInfo';
import { formatEuros, productQuote, productSections } from '@/server/catalog/mapping';
import type { ProductView } from '@/server/catalog/types';

// Corps de la fiche produit (vues mobile et ordinateur), partagé par la page publique et l'aperçu privé
// de l'espace créatrice. Rendu repris de legacy/src/pages/ProductDetail.tsx. `buy` : bouton d'achat.
export default function ProductDetail({ product, buy }: { product: ProductView; buy: ReactNode }) {
  const price = formatEuros(product.priceCents);
  // Seuls les textes affichés partent vers les composants du navigateur.
  const quote = productQuote(product);
  const sections = productSections(product);
  return (
    <>
      <style>
        {`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}
      </style>

      {/* ── VUE MOBILE ── */}
      <div className="lg:hidden">
        <MobileGallery images={product.images} name={product.name} />
        <div className="px-6 py-8" data-zone="infos-produit">
          <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 mb-2 block">{product.categoryName}</span>
          <h1 className="font-serif text-3xl mb-4">{product.name}</h1>
          <p className="text-lg mb-8">{price} €</p>

          {buy}

          {/* Ajout de la refonte : la fiche mobile affiche aussi l'accroche et les rubriques. */}
          <div className="mt-10">
            <ProductQuote quote={quote} />
            <ProductAccordions sections={sections} />
          </div>
        </div>
      </div>

      {/* ── VUE ORDINATEUR ── */}
      <div className="hidden lg:flex" style={{ height: '100vh' }}>
        <div
          className="w-[62%] overflow-y-scroll no-scrollbar"
          style={{ scrollSnapType: 'y mandatory', height: '100vh' }}
        >
          {product.images.map((img, i) => (
            <div
              key={img.url}
              style={{ scrollSnapAlign: 'start', height: '100vh' }}
              className="relative overflow-hidden bg-neutral-50"
            >
              <Image
                src={img.url}
                alt={img.alt || `${product.name} ${i + 1}`}
                fill
                sizes="62vw"
                priority={i === 0}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-8 left-8 text-[11px] uppercase tracking-[0.12em] text-white/60">
                {String(i + 1).padStart(2, '0')} / {String(product.images.length).padStart(2, '0')}
              </div>
            </div>
          ))}
        </div>

        <div className="w-[38%] h-screen flex flex-col justify-center px-12 xl:px-16 border-l border-neutral-100 overflow-y-auto" data-zone="infos-produit">
          <div className="max-w-sm mx-auto w-full py-12">

            <BackButton />

            <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 block mb-3">
              {product.categoryName} {product.subName && `— ${product.subName}`}
            </span>
            {/* Une seule balise <h1> par page (vue mobile) ; ici, titre équivalent pour les lecteurs d'écran. */}
            <p role="heading" aria-level={1} className="font-serif text-3xl xl:text-4xl leading-tight mb-4">
              {product.name}
            </p>
            <p className="text-sm tracking-[0.12em] mb-10 text-neutral-800">
              {price} €
            </p>

            <ProductQuote quote={quote} />

            <div className="mb-10">
              {buy}
            </div>

            <ProductAccordions sections={sections} />
          </div>
        </div>
      </div>
    </>
  );
}
