'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ProductCard from './ProductCard';
import type { CategoryView, ProductCardView } from '@/server/catalog/types';

// Rendu et filtres repris de legacy/src/pages/Collection.tsx. Les données arrivent du serveur
// (présentes dans le HTML initial) ; la recherche et les sous-filtres restent dans le navigateur.
type Props = { products: ProductCardView[]; categories: CategoryView[] };

const CollectionView = ({ products, categories }: Props) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeCategoryUrl = searchParams.get('category');
  const activeCategory = categories.find((c) => c.slug === activeCategoryUrl) ?? null;

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') ?? '');
  const [activeSub, setActiveSub] = useState<string | null>(searchParams.get('sub'));
  const [isFocusedLayout, setIsFocusedLayout] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Arrivée par le bouton « Rechercher » de l'en-tête (?focus=true) : champ mis en avant.
  useEffect(() => {
    if (searchParams.get('focus') !== 'true' || !searchInputRef.current) return;
    setIsFocusedLayout(true);
    const t = setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    return () => clearTimeout(t);
  }, [searchParams]);

  // Changement de catégorie par l'adresse : sous-filtre remis à zéro.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveSub(searchParams.get('sub'));
  }, [activeCategoryUrl, searchParams]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter((product) => {
      const matchesSearch = term
        ? product.name.toLowerCase().includes(term) || product.subName.toLowerCase().includes(term)
        : true;
      const matchesUrlCat = activeCategoryUrl ? product.categorySlug === activeCategoryUrl : true;
      const matchesSub = activeSub ? product.subSlug === activeSub : true;
      return matchesSearch && matchesUrlCat && matchesSub;
    });
  }, [searchTerm, products, activeCategoryUrl, activeSub]);

  const openSub = (category: string, sub: string) => {
    router.push(`${pathname}?category=${category}&sub=${sub}`, { scroll: false });
    setActiveSub(sub);
  };

  return (
    <div className="min-h-screen bg-white">

      <section className={`transition-all duration-1000 ease-in-out px-6 md:px-16 border-b-[0.5px] border-neutral-100
        ${isFocusedLayout ? 'py-5 bg-white' : 'py-1 bg-neutral-50/30'}`}>

        <div className={`max-w-[1700px] mx-auto flex flex-col transition-all duration-1000
          ${isFocusedLayout ? 'items-center text-center' : 'md:flex-row md:items-end justify-between gap-12'}`}>

          <div className={`flex flex-col transition-all duration-700 ${isFocusedLayout ? 'opacity-0 h-0 overflow-hidden mb-0' : 'opacity-100 mb-0'}`}>
            <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-300 mb-4">Artisanat Français</span>
            <h1 className="font-serif text-5xl md:text-7xl text-black leading-none">
              {activeCategory ? activeCategory.name : 'Les collections'}
            </h1>
          </div>

          <div className={`transition-all duration-1000 relative group ${isFocusedLayout ? 'w-full max-lg' : 'w-full md:w-1/3'}`}>
            <input
              ref={searchInputRef}
              type="text"
              aria-label="Rechercher une pièce"
              placeholder="Rechercher une pièce..."
              onFocus={() => setIsFocusedLayout(true)}
              onBlur={() => { if (!searchTerm) setIsFocusedLayout(false); }}
              className={`w-full outline-none bg-transparent transition-all duration-700 text-center
                ${isFocusedLayout
                  ? 'px-8 py-3.5 border border-black rounded-full text-[14px] focus:bg-neutral-50/50'
                  : 'py-3 border-b border-neutral-200 text-sm'}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isFocusedLayout && (
               <p className="mt-4 text-[11px] uppercase tracking-[0.12em] text-neutral-300 animate-pulse">Explorez l&apos;Atelier</p>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-[1700px] mx-auto px-6 md:px-16 py-24">

        {(searchTerm || activeCategoryUrl) ? (
          <div className="space-y-20">

            {activeCategory && (
              <div className="flex flex-wrap gap-8 border-b border-neutral-50 pb-8">
                <button
                  onClick={() => setActiveSub(null)}
                  className={`text-[11px] uppercase tracking-[0.12em] transition-colors ${!activeSub ? 'text-black font-bold' : 'text-neutral-300 hover:text-black'}`}
                >
                  Tout voir
                </button>

                {activeCategory.subs.map((sub) => (
                  <button
                    key={sub.slug}
                    onClick={() => setActiveSub(sub.slug)}
                    className={`text-[11px] uppercase tracking-[0.12em] transition-colors ${activeSub === sub.slug ? 'text-black font-bold' : 'text-neutral-300 hover:text-black'}`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-32">
              {filteredProducts.map((product, idx) => (
                <div
                  key={product.id}
                  className={`
                    ${idx % 3 === 1 ? 'lg:mt-20' : ''}
                    ${idx % 3 === 2 ? 'lg:mt-40' : ''}
                    animate-in fade-in slide-in-from-bottom-4 duration-700
                  `}
                >
                  <ProductCard product={product} priority={idx < 3} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          categories.map((cat, index) => {
            const collectionProducts = products.filter((p) => p.categorySlug === cat.slug);
            if (collectionProducts.length === 0) return null;

            return (
              <div key={cat.slug} className="mb-60 last:mb-0">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
                  <div className="flex items-center gap-10">
                    <span className="text-[11px] font-bold text-neutral-300">0{index + 1}</span>
                    <h2 className="font-serif text-4xl md:text-5xl text-black">{cat.name}</h2>
                  </div>

                  <div className="flex flex-wrap gap-6 md:gap-10">
                    {cat.subs.map((sub) => (
                      <button
                        key={sub.slug}
                        onClick={() => openSub(cat.slug, sub.slug)}
                        className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 hover:text-black transition-colors"
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-32">
                  {collectionProducts.slice(0, 6).map((product, pIdx) => (
                    <div
                      key={product.id}
                      className={`
                        ${pIdx % 3 === 1 ? 'lg:mt-24' : ''}
                        ${pIdx % 3 === 2 ? 'lg:mt-48' : ''}
                      `}
                    >
                      <ProductCard product={product} priority={index === 0 && pIdx < 3} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CollectionView;
