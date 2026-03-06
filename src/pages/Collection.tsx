import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import ProductCard from '../components/products/ProductCard';

const Collection = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSub, setActiveSub] = useState<string | null>(null); // Filtre de sous-catégorie
  const [isFocusedLayout, setIsFocusedLayout] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  // ═══════════════════════════════════════════════════
  // CHARGEMENT DES DONNÉES FIREBASE
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    const unsubProd = onSnapshot(query(collection(db, "produits"), orderBy("createdAt", "desc")), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const unsubCats = onSnapshot(collection(db, "categories"), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubProd(); unsubCats(); };
  }, []);

  // ═══════════════════════════════════════════════════
  // LOGIQUE DE FOCUS STRATÉGIQUE (RÈGLE DE GESTION)
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldFocus = params.get('focus') === 'true';
    const forceFocus = location.state?.forceFocus;

    if ((shouldFocus || forceFocus) && !loading && searchInputRef.current) {
      setIsFocusedLayout(true);
      
      // Timeout pour garantir le rendu avant le focus/scroll (Crucial pour mobile)
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [location.search, location.state, loading]);

  // Reset du sous-filtre quand on change de catégorie via l'URL
  const params = new URLSearchParams(location.search);
  const activeCategoryUrl = params.get('category');

  useEffect(() => {
    setActiveSub(null);
  }, [activeCategoryUrl]);

  // ═══════════════════════════════════════════════════
  // MOTEUR DE FILTRAGE DYNAMIQUE
  // ═══════════════════════════════════════════════════
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = searchTerm ? 
        (product.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         product.subCategory?.toLowerCase().includes(searchTerm.toLowerCase())) : true;
      
      const matchesUrlCat = activeCategoryUrl ? product.category === activeCategoryUrl : true;
      
      const matchesSub = activeSub ? product.subCategory === activeSub : true;

      return matchesSearch && matchesUrlCat && matchesSub;
    });
  }, [searchTerm, products, activeCategoryUrl, activeSub]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-serif italic text-black/20 text-xl tracking-widest">
      L'Atelier Jaelle & JC…
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      
      {/* ═══════════════════════════════════════════════════
          HEADER : Titre & Recherche (Transition Ligne vers Pilule)
      ═══════════════════════════════════════════════════ */}
      <section className={`transition-all duration-1000 ease-in-out px-6 md:px-16 border-b-[0.5px] border-neutral-100 
        ${isFocusedLayout ? 'py-5 bg-white' : 'py-1 bg-neutral-50/30'}`}>
        
        <div className={`max-w-[1700px] mx-auto flex flex-col transition-all duration-1000 
          ${isFocusedLayout ? 'items-center text-center' : 'md:flex-row md:items-end justify-between gap-12'}`}>
          
          <div className={`flex flex-col transition-all duration-700 ${isFocusedLayout ? 'opacity-0 h-0 overflow-hidden mb-0' : 'opacity-100 mb-0'}`}>
            <span className="text-[9px] uppercase tracking-[0.6em] text-neutral-300 mb-4 italic">Artisanat Français</span>
            <h1 className="font-serif text-5xl md:text-7xl italic text-black leading-none">
              {activeCategoryUrl ? activeCategoryUrl : "Les collections"}
            </h1>
          </div>
          
          <div className={`transition-all duration-1000 relative group ${isFocusedLayout ? 'w-full max-lg' : 'w-full md:w-1/3'}`}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Rechercher une pièce..."
              onFocus={() => setIsFocusedLayout(true)}
              onBlur={() => { if (!searchTerm) setIsFocusedLayout(false); }}
              className={`w-full outline-none bg-transparent transition-all duration-700 text-center
                ${isFocusedLayout 
                  ? 'px-8 py-3.5 border border-black rounded-full font-serif italic text-[13px] focus:bg-neutral-50/50' 
                  : 'py-3 border-b border-neutral-200 text-sm font-serif italic'}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isFocusedLayout && (
               <p className="mt-4 text-[9px] uppercase tracking-[0.5em] text-neutral-300 animate-pulse">Explorez l'Atelier</p>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          GRILLE DE PRODUITS & UNIVERS (Architecture Intégrale)
      ═══════════════════════════════════════════════════ */}
      <div className="max-w-[1700px] mx-auto px-6 md:px-16 py-24">
        
        {/* CAS 1 : RECHERCHE OU FILTRE URL ACTIF */}
        {(searchTerm || activeCategoryUrl) ? (
          <div className="space-y-20">
            
            {/* Barre de Sous-Filtres Dynamique */}
            {activeCategoryUrl && (
              <div className="flex flex-wrap gap-8 border-b border-neutral-50 pb-8">
                <button 
                  onClick={() => setActiveSub(null)}
                  className={`text-[10px] uppercase tracking-[0.3em] transition-colors ${!activeSub ? 'text-black font-bold' : 'text-neutral-300 hover:text-black'}`}
                >
                  Tout voir
                </button>
                
                {categories.find(c => c.id === activeCategoryUrl)?.subs?.map((sub: string) => (
                  <button 
                    key={sub}
                    onClick={() => setActiveSub(sub)}
                    className={`text-[10px] uppercase tracking-[0.3em] transition-colors ${activeSub === sub ? 'text-black font-bold' : 'text-neutral-300 hover:text-black'}`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}

            {/* Grille de produits filtrés */}
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
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* CAS 2 : VUE GÉNÉRALE PAR UNIVERS (Architecture 01, 02, etc.) */
          categories.map((cat, index) => {
            const collectionProducts = products.filter(p => p.category === cat.id);
            if (collectionProducts.length === 0) return null;

            return (
              <div key={cat.id} className="mb-60 last:mb-0">
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
                  <div className="flex items-center gap-10">
                    <span className="text-[10px] font-bold text-neutral-300">0{index + 1}</span>
                    <h2 className="font-serif text-4xl md:text-5xl italic text-black">{cat.id}</h2>
                  </div>
                  
                  {/* Filtres rapides par Univers */}
                  <div className="flex flex-wrap gap-6 md:gap-10">
                    {cat.subs?.map((sub: string) => (
                      <button 
                        key={sub}
                        onClick={() => {
                          const url = new URL(window.location.href);
                          url.searchParams.set('category', cat.id);
                          window.history.pushState({}, '', url);
                          setActiveSub(sub);
                        }}
                        className="text-[9px] uppercase tracking-[0.3em] text-neutral-400 hover:text-black transition-colors"
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grille décalée par Univers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-32">
                  {collectionProducts.slice(0, 6).map((product, pIdx) => (
                    <div 
                      key={product.id} 
                      className={`
                        ${pIdx % 3 === 1 ? 'lg:mt-24' : ''} 
                        ${pIdx % 3 === 2 ? 'lg:mt-48' : ''}
                      `}
                    >
                      <ProductCard product={product} />
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

export default Collection;