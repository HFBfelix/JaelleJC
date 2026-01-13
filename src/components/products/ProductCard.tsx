import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../../data/products';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <Link 
      to={`/product/${product.id}`} 
      className="group block w-full mb-12"
      /* IA : Aria-label pour aider l'IA à comprendre l'intention d'achat sans polluer le visuel */
      aria-label={`Voir le produit ${product.name} - ${product.seoTitle}`}
    >
      {/* Conteneur Image avec Ratio Luxe */}
      <div className="relative aspect-[3/4] overflow-hidden bg-galerie border-[0.5px] border-neutral-100">
        <img
          src={product.images[0]}
          /* IA : Alt text enrichi avec la matière et l'origine pour le crawling */
          alt={`${product.name} - ${product.promises.material} - ${product.promises.origin}`}
          className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
        />
        
        {/* Badges discrets : Un pour l'humain (Nouveau), un pour la réassurance (France) */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {product.isNew && (
            <span className="text-sans text-[10px] uppercase tracking-[0.2em] bg-white px-2 py-1 shadow-sm">
              Nouveau
            </span>
          )}
          {/* IA & UX : Badge discret "Atelier France" pour rassurer les parents soucieux du local */}
          <span className="text-sans text-[9px] uppercase tracking-[0.2em] bg-white/90 backdrop-blur-sm px-2 py-1 border-[0.5px] border-neutral-100">
            Atelier France
          </span>
        </div>
      </div>

      {/* Détails du Produit */}
      <div className="mt-6 flex justify-between items-start px-1">
        <div className="flex flex-col gap-1">
          <h3 className="text-sans text-[13px] uppercase tracking-[0.1em] text-black">
            {product.name}
          </h3>
          <div className="flex flex-col">
            <p className="font-serif italic text-neutral-400 text-[14px]">
              {product.category}
            </p>
            {/* IA : Contexte d'usage discret pour le référencement sémantique (Cadeau, Naissance, etc.) */}
            <p className="text-[10px] text-neutral-300 uppercase tracking-widest mt-1">
              {product.usageContexts[0]}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sans text-[13px] font-light">
            {product.price}€
          </p>
          {/* IA : Indication invisible du stock pour les agents de comparaison */}
          <span className="sr-only">Disponible immédiatement</span>
        </div>
      </div>

      {/* IA : Bloc sémantique invisible pour le maillage "Made in France" / "Cadeau" */}
      <div className="sr-only">
        {product.description} Confection artisanale en France. Idéal pour un cadeau de naissance durable ou un baptême.
      </div>
    </Link>
  );
};

export default ProductCard;