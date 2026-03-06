import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductGrid from '../components/products/ProductGrid';
import HeroImmersif from '../components/home/HeroImmersif';

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
    <div className="w-full bg-white font-sans antialiased">
      
      {/* ═══════════════════════════════════════════════════
          HERO IMMERSIF : Le plein écran (100vh)
      ═══════════════════════════════════════════════════ */}
      <HeroImmersif />

      {/* ═══════════════════════════════════════════════════
          SECTION MANIFESTE : Marges fluides (LV Style)
      ═══════════════════════════════════════════════════ */}
      <article className="py-[12vh] px-[6.4vw] md:px-[8.33vw] flex flex-col items-center text-center">
        <div className="max-w-[1200px] animate-in fade-in slide-in-from-bottom-8 duration-1000">
          
          <h1 className="font-serif text-[clamp(2.5rem,6vw,5rem)] italic leading-[1.1] mb-[6vh]">
            Dessiner un vestiaire de l'essentiel <br className="hidden md:block"/> pour la femme et l'enfant.
          </h1>
          
          {/* Ligne signature fine et discrète */}
          <div className="w-[1px] h-[10vh] bg-black mx-auto mb-[6vh] opacity-10"></div> 

          <div className="max-w-[800px] mx-auto space-y-[4vh]">
            <p className="font-serif text-[clamp(1.2rem,2.5vw,1.8rem)] text-neutral-800 italic tracking-tight">
              "Bienvenue là où l'artisanat français rencontre une mode pensée pour durer."
            </p>
            
            <div className="max-w-[500px] mx-auto">
              <p className="text-[clamp(12px,1.2vw,14px)] text-neutral-500 leading-relaxed tracking-[0.05em] uppercase opacity-70">
                L'excellence du <span className="text-black border-b-[0.5px] border-black/30 pb-1">fait-main</span> pour 
                ceux qui cherchent une alternative durable.
              </p>
            </div>
          </div>
        </div>
      </article>

      {/* ═══════════════════════════════════════════════════
          SECTION RECHERCHE : Barre "Écrin"
      ═══════════════════════════════════════════════════ */}
      <section className="py-[8vh] px-[6.4vw] md:px-[8.33vw] bg-neutral-50/40 border-y-[0.5px] border-neutral-100">
        <div className="max-w-[600px] mx-auto">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Chercher une pièce, un usage..."
              className="w-full py-4 text-center text-xl md:text-2xl font-serif italic outline-none bg-transparent placeholder:text-neutral-500 border-b border-neutral-200 focus:border-black transition-all duration-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
          
          <div className="mt-[4vh] flex flex-wrap justify-center gap-x-12 gap-y-4">
            {['Cabas', 'Naissance', 'Lin'].map((tag) => (
              <button 
                key={tag}
                onClick={() => navigate(`/collection?search=${tag}`)}
                className="text-[10px] uppercase tracking-[0.4em] text-neutral-400 hover:text-black transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION PRODUITS : Rythme Fluide
      ═══════════════════════════════════════════════════ */}
      <div id="collection" className="pt-[10vh] pb-0 px-[6.4vw] md:px-[8.33vw]">
  
  {/* BLOC TITRE : On utilise le même espacement en bas qu'en haut (10vh) */}
  <div className="flex items-center gap-6 md:gap-10 mb-[1vh]">
    <span className="text-[10px] font-bold tracking-[0.6em] text-neutral-300">01</span>
    <h2 className="font-serif text-[clamp(1.5rem,3vw,2.5rem)] italic text-black whitespace-nowrap">
      L'essentiel
    </h2>
    <div className="h-[0.5px] flex-grow bg-neutral-100"></div>
  </div>
  
  {/* Grille : L'espace au-dessus est maintenant exactement de 10vh */}
  <div className="relative">
     <ProductGrid />
  </div>
</div>

      {/* ═══════════════════════════════════════════════════
          FOOTER : Signature de Maison
      ═══════════════════════════════════════════════════ */}
      <footer className="py-[12vh] px-[6.4vw] text-center border-t-[0.5px] border-neutral-100">
        <div className="max-w-[600px] mx-auto space-y-10">
          <p className="font-serif italic text-[clamp(1.5rem,2.5vw,2rem)] text-neutral-800">
            De belles matières, l'amour de l'artisanat.
          </p>
          <div className="w-12 h-[1px] bg-neutral-200 mx-auto"></div>
          <p className="text-[9px] text-neutral-400 uppercase tracking-[0.6em]">
            Atelier Jaelle & JC — France
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;