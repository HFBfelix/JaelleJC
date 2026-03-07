import React, { useState } from 'react';
import { ShoppingBag, Check, AlertCircle } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';

interface BuyButtonProps {
  product: {
    id: string;
    name: string;
    price: number;
    images: string[];
    category: string;
    stock: number;
  };
  onNeedLogin?: () => void; // Callback optionnel si l'utilisateur n'est pas connecté
  className?: string;       // Permet de surcharger les styles depuis le parent
}

const BuyButton: React.FC<BuyButtonProps> = ({ product, onNeedLogin, className }) => {
  const { addToCart, cart } = useCart();
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'added' | 'maxStock'>('idle');

  // Quantité déjà dans le panier pour ce produit
  const inCartQty = cart.find(item => item.id === product.id)?.quantity || 0;
  const isOutOfStock = !product.stock || product.stock <= 0;
  const isAtMaxStock = inCartQty >= product.stock;

  const handleClick = () => {
    if (isOutOfStock || isAtMaxStock) return;

    // Si non connecté, déclencher la modal de connexion
    

    addToCart(product);

    // Feedback visuel temporaire
    setStatus('added');
    setTimeout(() => setStatus('idle'), 2000);
  };

  // Styles de base — surchargeable via className
  const baseClass = className || "w-full bg-black text-white py-5 flex items-center justify-center gap-3 group hover:bg-neutral-900 transition-all duration-300 disabled:bg-neutral-200 disabled:cursor-not-allowed";

  if (isOutOfStock) {
    return (
      <button disabled className={baseClass}>
        <AlertCircle size={14} strokeWidth={1} />
        <span className="text-[10px] uppercase tracking-[0.4em]">Épuisé</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isAtMaxStock || status === 'added'}
      className={baseClass}
    >
      {status === 'added' ? (
        <>
          <Check size={14} strokeWidth={1.5} className="text-white" />
          <span className="text-[10px] uppercase tracking-[0.4em]">Ajouté</span>
        </>
      ) : isAtMaxStock ? (
        <>
          <AlertCircle size={14} strokeWidth={1} />
          <span className="text-[10px] uppercase tracking-[0.4em]">Stock max atteint</span>
        </>
      ) : (
        <>
          <ShoppingBag size={14} strokeWidth={1} className="group-hover:scale-110 transition-transform duration-300" />
          <span className="text-[10px] uppercase tracking-[0.4em]">Ajouter à la sélection</span>
        </>
      )}
    </button>
  );
};

export default BuyButton;