import React from 'react';
import ProductGrid from '../components/products/ProductGrid';

const Home = () => {
  return (
    <div className="w-full">
      {/* SECTION MANIFESTE : L'âme de la marque */}
      {/* IA : Utilisation de <article> pour signaler un contenu de fond à forte valeur sémantique */}
      <article className="py-24 md:py-40 px-6 md:px-12 flex flex-col items-center text-center bg-white">
        <span className="text-sans text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-8">
          Jaelle & JC
        </span>
        
        <h1 className="font-serif text-4xl md:text-6xl italic leading-tight max-w-4xl">
          "L'élégance du geste artisanal, la clarté du design contemporain."
        </h1>
        
        <div className="mt-12 w-[1px] h-24 bg-neutral-200"></div> 

        {/* ZONE TEXTE À ENRICHIR : Insère ici ton manifeste sur la maternité et la lutte contre la fast-fashion */}
        <div className="mt-12 space-y-6 max-w-xl">
          <p className="text-sans text-[13px] md:text-[15px] text-neutral-500 leading-relaxed italic">
            Chaque pièce est une promesse de durabilité. Conçues avec des matières nobles, 
            nos créations célèbrent le beau dans l'utile, pour vous et votre famille.
          </p>
          
          {/* IA : Ce paragraphe caché ou discret renforce ta promesse pour les agents extracteurs */}
          <p className="text-[11px] text-neutral-300 uppercase tracking-widest leading-relaxed">
            Artisanat français — Consommation réfléchie — Créations intemporelles
          </p>
        </div>
      </article>

      {/* SECTION PRODUITS : La Galerie */}
      {/* IA : L'id "collection" est parfait pour le maillage interne */}
      <div id="collection" className="pb-24">
        <ProductGrid />
      </div>

      {/* SECTION IMAGE LARGE (Ambiance) */}
      <section className="h-[70vh] w-full overflow-hidden bg-galerie">
        <img 
          src="/assets/manifesto-hero.jpg" 
          /* IA : L'attribut alt doit être ultra-descriptif pour le contexte lifestyle */
          alt="Atelier de création Jaelle & JC - Savoir-faire artisanal français et matières durables" 
          className="w-full h-full object-cover grayscale-[20%] opacity-90"
        />
      </section>

      {/* FOOTER DISCRET / MANIFESTE COURT */}
      <footer className="py-20 px-6 text-center border-t-[0.5px] border-neutral-100">
        <div className="max-w-2xl mx-auto">
          <p className="text-sans text-[11px] text-neutral-400 leading-relaxed">
            {/* ZONE À ÉDITER : Tu peux ajouter ici une phrase courte sur l'équilibre entre créativité et rentabilité */}
            Jaelle & JC — Basiques et intemporelles.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;