import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import BuyButton from './BuyButton'; // <--- AJOUT DE L'IMPORT ICI

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  subCategory?: string;
  images: string[];
  description: string;
  isNew?: boolean;
  usageContexts?: string[];
}

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // ── SÉCURITÉ & GESTION DES IMAGES ──
  const images = product?.images || [];
  const mainImage = images.length > 0 ? images[0] : '/assets/placeholder.png';
  const hoverImage = images.length > 1 ? images[1] : mainImage;
  const usage = product?.usageContexts && product.usageContexts.length > 0 ? product.usageContexts[0] : "";
  const displayCategory = product?.subCategory || product?.category || "";

  return (
    <div 
      className="group block w-full mb-1 md:mb-2 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/product/${product?.id}`}>
        {/* 1. CONTENEUR IMAGE AVEC SKELETON */}
        <div className="relative aspect-[3/4] overflow-hidden bg-neutral-50 border-[0.5px] border-neutral-100">
          
          {!isLoaded && (
            <div className="absolute inset-0 z-20 bg-neutral-100 overflow-hidden">
              <div className="w-full h-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full" 
                  style={{ backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)' }}
              />
            </div>
          )}

          <img
            src={mainImage}
            alt={product?.name}
            onLoad={() => setIsLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-1000 ease-[0.19,1,0.22,1] ${
              isHovered ? 'md:opacity-0 md:scale-110' : 'opacity-100 scale-100'
            } ${isLoaded ? 'visible' : 'invisible'}`}
          />

          <img
            src={hoverImage}
            alt={`${product?.name} - Vue alternative`}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-1000 ease-[0.19,1,0.22,1] hidden md:block ${
              isHovered ? 'opacity-100 scale-110' : 'opacity-0 scale-100'
            }`}
          />
          
          {/* Badges */}
          <div className={`absolute top-3 left-3 z-10 flex flex-col gap-1.5 transition-opacity duration-500 ${isHovered || !isLoaded ? 'opacity-0' : 'opacity-100'}`}>
            {product?.isNew && (
              <span className="text-sans text-[9px] uppercase tracking-[0.2em] bg-white px-2 py-1 shadow-sm font-medium">
                Nouveau
              </span>
            )}
            <span className="text-sans text-[8px] uppercase tracking-[0.2em] bg-white/90 backdrop-blur-sm px-2 py-1 border-[0.5px] border-neutral-100">
              Atelier France
            </span>
          </div>

          <div className={`absolute inset-0 z-10 bg-black/5 transition-opacity duration-700 hidden md:block ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
        </div>

        {/* 2. INFOS PRODUIT */}
        <div className={`mt-4 flex flex-col md:flex-row justify-between items-start px-1 transition-all duration-500 ease-in-out ${
          isHovered ? 'md:opacity-0 md:translate-y-2' : 'opacity-100 translate-y-0'
        }`}>
          <div className="flex flex-col gap-0.5 w-full overflow-hidden">
            <h3 className="text-sans text-[11px] md:text-[13px] uppercase tracking-[0.1em] text-black truncate">
              {product?.name || "Chargement..."}
            </h3>
            
            <div className="flex flex-col overflow-hidden">
              <p className="hidden md:block font-serif italic text-neutral-400 text-[12px] md:text-[14px] truncate">
                {displayCategory}
              </p>
            </div>
          </div>
          
          <div className="mt-1 md:mt-0">
            <p className="text-sans text-[11px] md:text-[13px] font-light">
              {product?.price}€
            </p>
          </div>
        </div>
      </Link>

     

      <div className="sr-only">
        {product?.description || `Découvrez le ${product?.name}.`} Confection artisanale chez Jaelle & JC.
      </div>

      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default ProductCard;