import React, { useState } from 'react';
import { X, Trash2, ArrowRight, Minus, Plus, AlertCircle } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useNavigate } from 'react-router-dom';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const { cart, removeFromCart, updateQuantity, total, itemCount } = useCart();
  const navigate = useNavigate();
  
  // État pour gérer les erreurs de stock de manière élégante
  const [error, setError] = useState<{id: string, msg: string} | null>(null);

  const handleUpdateQuantity = (id: string, newQty: number, stock: number) => {
    // Vérification par rapport au stock réel du produit
    if (newQty > stock) {
      setError({ id, msg: "Quantité limitée par le stock disponible" });
      setTimeout(() => setError(null), 3000); // L'erreur s'efface après 3 secondes
      return;
    }
    
    if (newQty < 1) {
      removeFromCart(id);
      return;
    }
    
    updateQuantity(id, newQty);
  };

  return (
    <>
      {/* Overlay sombre avec flou */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-[200] transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panneau latéral coulissant */}
      <div className={`fixed top-0 right-0 h-full w-full md:w-[450px] bg-white z-[201] shadow-2xl transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        <div className="flex flex-col h-full">
          {/* Header du panier */}
          <div className="h-[65px] px-8 flex items-center justify-between border-b border-neutral-100">
            <span className="text-[10px] uppercase tracking-[0.4em] font-light italic">Votre Sélection ({itemCount})</span>
            <button onClick={onClose} className="hover:rotate-90 transition-transform duration-300">
              <X size={20} strokeWidth={1} />
            </button>
          </div>

          {/* Liste des articles - Scrollable */}
          <div className="flex-grow overflow-y-auto px-8 py-10">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <p className="font-serif italic text-neutral-400 mb-8">Votre panier est vide</p>
                <button 
                  onClick={() => { onClose(); navigate('/collection'); }} 
                  className="text-[10px] uppercase tracking-widest border-b border-black pb-1"
                >
                  Explorer la collection
                </button>
              </div>
            ) : (
              <div className="space-y-10">
                {cart.map((item) => (
                  <div key={item.id} className="flex gap-6 group relative">
                    {/* Image du produit */}
                    <div className="w-24 h-32 bg-neutral-50 overflow-hidden flex-shrink-0">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                      />
                    </div>
                    
                    {/* Informations et contrôles */}
                    <div className="flex-grow flex flex-col justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-[8px] uppercase tracking-widest text-neutral-400 mb-1">{item.category}</span>
                          <p className="text-sm font-light">{item.price * item.quantity} €</p>
                        </div>
                        <h3 className="font-serif italic text-lg">{item.name}</h3>
                        
                        {/* Sélecteur de quantité minimaliste */}
                        <div className="flex items-center gap-4 mt-4">
                          <div className="flex items-center border border-neutral-100">
                            <button 
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1, item.stock)}
                              className="p-2 hover:bg-neutral-50 transition-colors"
                            >
                              <Minus size={10} strokeWidth={1} />
                            </button>
                            <span className="text-[10px] w-6 text-center font-light">{item.quantity}</span>
                            <button 
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1, item.stock)}
                              className="p-2 hover:bg-neutral-50 transition-colors"
                            >
                              <Plus size={10} strokeWidth={1} />
                            </button>
                          </div>
                        </div>

                        {/* Message d'alerte stock - Jaune terne / Ambre discret */}
                        {error?.id === item.id && (
                          <div className="flex items-center gap-2 mt-3 text-amber-600/70 animate-pulse">
                            <AlertCircle size={10} />
                            <span className="text-[9px] uppercase tracking-tight italic font-light">
                              {error.msg}
                            </span>
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="flex items-center gap-2 text-[8px] uppercase tracking-widest text-neutral-300 hover:text-black transition-colors mt-4"
                      >
                        <Trash2 size={10} /> Retirer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer - Résumé et Bouton d'action */}
          {cart.length > 0 && (
            <div className="p-8 border-t border-neutral-100 bg-neutral-50/50">
              <div className="flex justify-between items-end mb-8">
                <span className="text-[10px] uppercase tracking-widest text-neutral-400">Total estimation</span>
                <span className="text-2xl font-light">{total} €</span>
              </div>
              <p className="text-[8px] uppercase tracking-[0.2em] text-neutral-400 mb-6 text-center italic">
                Livraison offerte
              </p>
              <button 
                onClick={() => { onClose(); navigate('/checkout'); }}
                className="w-full bg-black text-white py-6 flex items-center justify-center gap-4 group hover:bg-neutral-800 transition-all"
              >
                <span className="text-[10px] uppercase tracking-[0.4em]">Finaliser l'acquisition</span>
                <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CartDrawer;