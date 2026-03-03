import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import ProductCard from '../components/products/ProductCard';

const Collection = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  useEffect(() => {
    const fetchFromFirebase = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "produits"));
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(docs);
      } catch (error) {
        console.error("Erreur :", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFromFirebase();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('focus') === 'true') {
      // Attendre que la page soit rendue ET que le clavier mobile soit prêt
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus({ preventScroll: false });
          // Trick mobile : dispatcher un event tactile simulé
          searchInputRef.current.click();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.search]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const nameMatch = (product.name || "").toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = (product.category || "").toLowerCase().includes(searchTerm.toLowerCase());
      return nameMatch || categoryMatch;
    });
  }, [searchTerm, products]);

  const collections = ['sacs', 'bebe', 'coffrets'];

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-serif italic text-neutral-400 text-xl">
      Jaelle & JC…
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <section className="pt-4 pb-8 px-6 md:px-16 border-b-[0.5px] border-neutral-100">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-[0.6em] text-neutral-300 mb-2">Maison</span>
            <h1 className="font-serif text-5xl md:text-6xl italic leading-none">La Collection</h1>
          </div>
          <div className="w-full md:w-1/3 relative group">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Chercher une pièce..."
              className="w-full py-2 text-sm font-serif italic border-b border-neutral-100 outline-none bg-transparent placeholder:text-neutral-200 focus:border-black transition-all duration-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-0 bottom-3 text-[9px] uppercase tracking-widest text-neutral-400 hover:text-black"
              >
                Effacer
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-[1700px] mx-auto px-6 md:px-16 py-12">
        {searchTerm ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-32">
            {filteredProducts.map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          collections.map((col, index) => {
            const collectionProducts = products.filter(p => p.category?.toLowerCase() === col.toLowerCase());
            if (collectionProducts.length === 0) return null;
            return (
              <div key={col} className="mb-40 last:mb-0">
                <div className="flex items-center gap-6 mb-16">
                  <span className="text-[10px] font-light text-neutral-300">0{index + 1}</span>
                  <h2 className="font-serif text-3xl italic capitalize tracking-tight">{col}</h2>
                  <div className="h-[0.5px] flex-grow bg-neutral-100"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-24">
                  {collectionProducts.map((product, pIdx) => (
                    <div key={product.id} className={`${pIdx % 3 === 1 ? 'lg:mt-20' : ''} ${pIdx % 3 === 2 ? 'lg:mt-40' : ''}`}>
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