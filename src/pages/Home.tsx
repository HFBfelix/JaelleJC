import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductGrid from '../components/products/ProductGrid';

const Home = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/collection?search=${encodeURIComponent(searchTerm)}`);
    }
  };

  return (
    <div className="w-full bg-white">
      
      {/* ═══════════════════════════════════════════════════
          SECTION MANIFESTE : L'entrée dans l'Atelier
      ═══════════════════════════════════════════════════ */}
      <article className="min-h-[95vh] flex flex-col items-center justify-center px-6 md:px-12 text-center bg-white">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
          
          <h1 className="font-serif text-5xl md:text-8xl italic leading-[1.1] max-w-6xl mb-16">
            Dessiner un vestiaire de l'essentiel <br className="hidden md:block"/> pour la femme et l'enfant.
          </h1>
          
          <div className="w-[0.5px] h-32 bg-black mx-auto mb-16 opacity-20"></div> 

          <div className="space-y-12 max-w-3xl mx-auto">
            <p className="font-serif text-2xl md:text-3xl text-neutral-800 leading-relaxed italic">
              "Bienvenue là où l'artisanat français rencontre une mode pensée pour durer."
            </p>
            
            <div className="max-w-xl mx-auto">
              <p className="text-sans text-[13px] md:text-[15px] text-neutral-500 leading-relaxed tracking-wide">
                Qu'il s'agisse d'un <span className="text-black border-b-[0.5px] border-black/20 pb-1">cabas en coton</span> qui vous accompagne chaque jour 
                ou d'un <span className="text-black border-b-[0.5px] border-black/20 pb-1">cadeau de naissance intemporel</span> à transmettre, nous créons pour 
                ceux qui cherchent une alternative durable à la fast-fashion.
              </p>
            </div>
          </div>
        </div>
      </article>

      {/* ═══════════════════════════════════════════════════
          SECTION RECHERCHE : L'Expérience Mobile & Desktop
          IA : Positionnée en transition avant la grille
      ═══════════════════════════════════════════════════ */}
      <section className="py-24 px-6 md:px-12 bg-neutral-50/50">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSearch} className="relative group">
            <input
              type="text"
              placeholder="Chercher une pièce, un usage..."
              className="w-full py-8 text-2xl md:text-5xl font-serif italic text-center outline-none bg-transparent placeholder:text-neutral-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/4 h-[0.5px] bg-black scale-x-0 group-focus-within:scale-x-100 transition-transform duration-1000"></div>
          </form>
          
          <div className="mt-10 flex flex-wrap justify-center gap-x-10 gap-y-4">
            {['Cabas', 'Naissance', 'Lin'].map((tag) => (
              <button 
                key={tag}
                onClick={() => navigate(`/collection?search=${tag}`)}
                className="text-[9px] uppercase tracking-[0.4em] text-neutral-400 hover:text-black transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION PRODUITS : La Galerie
      ═══════════════════════════════════════════════════ */}
      <div id="collection" className="py-32 px-6 md:px-12">
        <div className="flex items-center gap-8 mb-20">
          <span className="text-[10px] uppercase tracking-[0.5em] text-neutral-300">01</span>
          <h2 className="font-serif text-3xl italic">L'Essentiel</h2>
          <div className="h-[0.5px] flex-grow bg-neutral-100"></div>
        </div>
        <ProductGrid />
      </div>

      {/* ═══════════════════════════════════════════════════
          SECTION IMAGE LARGE : Le Focus Visuel
      ═══════════════════════════════════════════════════ */}
      <section className="h-[75vh] md:h-[90vh] w-full overflow-hidden relative">
        <img 
          src="/assets/Cabasmoutarde4.png" 
          alt="Cabas artisanat français Jaelle & JC" 
          className="w-full h-full object-cover grayscale-[15%] brightness-[0.9] hover:scale-105 transition-transform duration-[6s] ease-out"
        />
        <div className="absolute inset-0 bg-black/5 md:hidden"></div> {/* Overlay léger mobile */}
        <div className="absolute bottom-12 right-12 text-white text-right">
          <p className="text-[10px] uppercase tracking-[0.5em] opacity-70">Maison Jaelle & JC</p>
          <p className="font-serif italic text-xl mt-2">L'âme de l'artisanat</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FOOTER MANIFESTE : La Signature finale
      ═══════════════════════════════════════════════════ */}
      <footer className="py-32 px-6 text-center border-t-[0.5px] border-neutral-50">
        <div className="max-w-2xl mx-auto space-y-8">
          <p className="font-serif italic text-2xl md:text-3xl text-neutral-800">
            De belles matières, l'amour de l'artisanat'.
          </p>
          <div className="space-y-2">
            <p className="text-sans text-[10px] text-neutral-400 uppercase tracking-[0.5em]">
              Basiques et intemporels.
            </p>
            <p className="text-[9px] text-neutral-300 uppercase tracking-[0.3em] pt-4">
              © 2026 — Jaelle & JC
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;