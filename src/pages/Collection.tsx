import React, { useState, useMemo } from 'react';
import { products } from '../data/products';
import ProductCard from '../components/products/ProductCard';
import { Search } from 'lucide-react';

const Collection = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // IA : Filtrage sémantique basé sur le nom, la catégorie ou le contexte d'usage
  const filteredProducts = useMemo(() => {
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.usageContexts.some(ctx => ctx.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm]);

  // Groupement par collection pour l'UX
  const collections = ['Sacs', 'Bébé', 'Coffrets'];

  return (
    <div className="min-h-screen bg-white">
      {/* SECTION RECHERCHE CENTRALE (Inspiration Vuitton) */}
      <section className="pt-20 pb-12 px-6 border-b-[0.5px] border-neutral-100">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative group">
            <input
              type="text"
              placeholder="Rechercher une pièce, un usage, une matière..."
              className="w-full py-8 text-2xl md:text-4xl font-serif italic text-center outline-none bg-transparent placeholder:text-neutral-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/4 h-[1px] bg-black scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500"></div>
          </div>
          
          {/* RECHERCHES POPULAIRES : Guide l'IA et l'utilisateur */}
          <div className="mt-8 flex flex-wrap justify-center gap-6">
            <span className="text-[10px] uppercase tracking-widest text-neutral-300">Recherches populaires :</span>
            {['Cabas', 'Cadeau Naissance', 'Lin', 'Baptême'].map((tag) => (
              <button 
                key={tag}
                onClick={() => setSearchTerm(tag)}
                className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-black transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* AFFICHAGE DES COLLECTIONS */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20">
        {searchTerm ? (
          /* Vue Résultats de recherche */
          <div>
            <h2 className="font-serif text-xl italic mb-12">Résultats pour "{searchTerm}" ({filteredProducts.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
              {filteredProducts.map(product => <ProductCard key={product.id} product={product} />)}
            </div>
          </div>
        ) : (
          /* Vue Collections Standard */
          collections.map(col => {
            const collectionProducts = products.filter(p => p.category === col);
            if (collectionProducts.length === 0) return null;
            
            return (
              <div key={col} className="mb-32">
                <div className="flex items-baseline justify-between mb-12 border-b-[0.5px] border-neutral-100 pb-6">
                  <h2 className="font-serif text-3xl italic">{col}</h2>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                    {collectionProducts.length} Modèles
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                  {collectionProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
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