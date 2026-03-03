import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  images: string[];
  description: string;
  isNew: boolean;
  usageContexts: string[];
  promises: {
    material: string;
    origin: string;
  };
}

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Sécurités conservées
  const mainImage = product.images && product.images.length > 0 ? product.images[0] : '/assets/placeholder.png';
  // IA : Reveal - On prend la 2ème image si elle existe, sinon la 1ère reste
  const hoverImage = product.images && product.images.length > 1 ? product.images[1] : mainImage;
  
  const usage = product.usageContexts && product.usageContexts.length > 0 ? product.usageContexts[0] : "";

  return (
    <Link 
      to={`/product/${product.id}`} 
      className="group block w-full mb-12 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`Voir le produit ${product.name}`}
    >
      {/* 1. CONTENEUR IMAGE : Double Image + Zoom */}
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-50 border-[0.5px] border-neutral-100">
        
        {/* Image de base : s'efface au survol */}
        <img
          src={mainImage}
          alt={product.name}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-1000 ease-[0.19,1,0.22,1] ${
            isHovered ? 'opacity-0 scale-110' : 'opacity-100 scale-100'
          }`}
        />

        {/* Image de Reveal : apparaît au survol */}
        <img
          src={hoverImage}
          alt={`${product.name} - Vue alternative`}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-1000 ease-[0.19,1,0.22,1] ${
            isHovered ? 'opacity-100 scale-110' : 'opacity-0 scale-100'
          }`}
        />
        
        {/* Badges : s'effacent doucement */}
        <div className={`absolute top-4 left-4 z-10 flex flex-col gap-2 transition-opacity duration-500 ${isHovered ? 'opacity-0' : 'opacity-100'}`}>
          {product.isNew && (
            <span className="text-sans text-[10px] uppercase tracking-[0.2em] bg-white px-2 py-1 shadow-sm">
              Nouveau
            </span>
          )}
          <span className="text-sans text-[9px] uppercase tracking-[0.2em] bg-white/90 backdrop-blur-sm px-2 py-1 border-[0.5px] border-neutral-100">
            Atelier France
          </span>
        </div>

        {/* Overlay discret (effet luxe) */}
        <div className={`absolute inset-0 z-10 bg-black/5 transition-opacity duration-700 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      {/* 2. INFOS PRODUIT : Disparition au survol */}
      <div className={`mt-6 flex justify-between items-start px-1 transition-all duration-500 ease-in-out ${
        isHovered ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}>
        <div className="flex flex-col gap-1">
          <h3 className="text-sans text-[13px] uppercase tracking-[0.1em] text-black">
            {product.name}
          </h3>
          <div className="flex flex-col">
            <p className="font-serif italic text-neutral-400 text-[14px]">
              {product.category}
            </p>
            <p className="text-[10px] text-neutral-300 uppercase tracking-widest mt-1">
              {usage}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sans text-[13px] font-light">
            {product.price}€
          </p>
        </div>
      </div>

      {/* 3. SEO : Accessibilité conservée */}
      <div className="sr-only">
        {product.description} Confection artisanale chez Jaelle & JC.
      </div>
    </Link>
  );
};

export default ProductCard;