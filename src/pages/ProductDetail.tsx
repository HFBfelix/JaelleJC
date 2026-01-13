import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { products } from '../data/products';
import { ChevronLeft, ShieldCheck, Truck, Ruler, Wind, Heart } from 'lucide-react';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="h-screen flex items-center justify-center font-serif italic text-xl">
        Pièce introuvable...
      </div>
    );
  }

  // SCRIPT IA : Génération du JSON-LD pour les agents
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.seoTitle,
    "description": product.longDescription,
    "brand": { "@type": "Brand", "name": "Jaelle & JC" },
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": "EUR",
      "availability": "https://schema.org/InStock"
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12 pt-[100px]">
      {/* Insertion du script pour les agents IA */}
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>

      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sans text-[11px] uppercase tracking-[0.2em] mb-12 hover:opacity-50 transition-opacity"
      >
        <ChevronLeft size={14} /> Retour à la collection
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
        {/* GALERIE IMAGES - Optimisée Alt IA */}
        <div className="flex flex-col gap-6">
          {product.images.map((img, index) => (
            <div key={index} className="bg-galerie border-[0.5px] border-neutral-100 overflow-hidden">
              <img 
                src={img} 
                alt={`${product.seoTitle} - ${product.promises.material}`} 
                className="w-full h-auto object-cover"
              />
            </div>
          ))}
        </div>

        {/* INFOS PRODUIT & ACHAT */}
        <div className="lg:sticky lg:top-[120px] h-fit flex flex-col">
          <span className="text-sans text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-4">
            {product.category} — {product.promises.origin}
          </span>
          <h1 className="font-serif text-4xl md:text-5xl italic mb-6">{product.name}</h1>
          <p className="text-sans text-[18px] mb-8 font-light">{product.price}€</p>
          
          <div className="h-[0.5px] w-full bg-neutral-200 mb-8"></div>

          {/* Description Longue (Sémantique IA) */}
          <div className="mb-10">
             <p className="text-sans text-[13px] leading-relaxed text-neutral-800 italic mb-4">
              "{product.longDescription}"
            </p>
          </div>

          {/* DÉTAILS TECHNIQUES (Structurés pour l'IA et l'UX) */}
          <div className="flex flex-col gap-6 mb-12 py-8 border-y-[0.5px] border-neutral-100">
            <div className="flex items-start gap-4 text-sans text-[11px] uppercase tracking-[0.1em] text-neutral-600">
              <Wind size={16} strokeWidth={1} />
              <span>{product.promises.material}</span>
            </div>
            <div className="flex items-start gap-4 text-sans text-[11px] uppercase tracking-[0.1em] text-neutral-600">
              <Ruler size={16} strokeWidth={1} />
              <span>{product.dimensions}</span>
            </div>
            <div className="flex items-start gap-4 text-sans text-[11px] uppercase tracking-[0.1em] text-neutral-600">
              <Heart size={16} strokeWidth={1} />
              <span>{product.careInstructions}</span>
            </div>
          </div>

          <a 
            href={product.sumupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-black text-white py-5 text-sans text-[11px] uppercase tracking-[0.3em] text-center hover:bg-neutral-800 transition-colors mb-4"
          >
            Acquérir cette pièce
          </a>
          <p className="text-center text-[10px] text-neutral-400 italic mb-12">
            Fabrication limitée — Soutenez l'artisanat français
          </p>

          {/* RASSURANCE LUXE */}
          <div className="flex flex-col gap-4 pt-8 border-t-[0.5px] border-neutral-100">
            <div className="flex items-center gap-4 text-sans text-[11px] uppercase tracking-[0.1em] text-neutral-400">
              <Truck size={16} strokeWidth={1} />
              <span>Livraison offerte en France Métropolitaine</span>
            </div>
            <div className="flex items-center gap-4 text-sans text-[11px] uppercase tracking-[0.1em] text-neutral-400">
              <ShieldCheck size={16} strokeWidth={1} />
              <span>Paiement sécurisé via SumUp®</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;