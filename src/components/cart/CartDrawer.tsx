import React, { useState, useEffect } from 'react';
import {
  X, Trash2, ArrowRight, Minus, Plus, Lock, Truck, Check
} from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db, trackEvent } from '../../lib/firebase'; // Ajout de trackEvent
import { doc, onSnapshot } from 'firebase/firestore';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, onOpenLogin }) => {
  const { cart, removeFromCart, updateQuantity, total, itemCount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // États pour la livraison dynamique
  const [deliverySettings, setDeliverySettings] = useState({ freeThreshold: 0, flatRate: 0 });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "delivery"), (snap) => {
      if (snap.exists()) setDeliverySettings(snap.data() as any);
    });
    return () => unsub();
  }, []);

  // Calculs de livraison
  const isFreeDelivery = deliverySettings.freeThreshold > 0 && total >= deliverySettings.freeThreshold;
  const remainingForFree = Math.max(0, deliverySettings.freeThreshold - total);
  const progress = deliverySettings.freeThreshold > 0
    ? Math.min(100, (total / deliverySettings.freeThreshold) * 100)
    : 0;

  const handleUpdateQuantity = (id: string, newQty: number, stock: number) => {
    if (newQty > stock) {
      setError("Quantité limitée par le stock disponible");
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (newQty < 1) { removeFromCart(id); return; }
    updateQuantity(id, newQty);
  };

  const handleFinalize = () => {
    if (!user) {
      onOpenLogin();
      return;
    }

    // 💡 TRACKING : Début du tunnel de paiement
    trackEvent('begin_checkout', {
      value: total,
      currency: 'EUR',
      items_count: itemCount
    });

    onClose();
    navigate('/checkout');
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-[200] transition-opacity duration-500
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <div className={`fixed top-0 right-0 h-full w-full md:w-[450px] bg-white z-[201] shadow-2xl
        transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">

          <div className="h-[65px] px-8 flex items-center justify-between border-b border-neutral-100">
            <span className="text-[10px] uppercase tracking-[0.4em] font-light italic">
              Votre sélection ({itemCount})
            </span>
            <button onClick={onClose} className="hover:rotate-90 transition-transform duration-300">
              <X size={20} strokeWidth={1} />
            </button>
          </div>

          {/* Barre de progression livraison offerte */}
          {cart.length > 0 && deliverySettings.freeThreshold > 0 && (
            <div className="px-8 py-6 bg-neutral-50/50 border-b border-neutral-100">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[9px] uppercase tracking-widest flex items-center gap-2">
                  <Truck size={12} strokeWidth={1.5} />
                  {isFreeDelivery ? "Livraison offerte" : `Plus que ${remainingForFree}€ pour la livraison offerte`}
                </span>
                {isFreeDelivery && <Check size={12} className="text-green-600" />}
              </div>
              <div className="h-[2px] bg-neutral-200 w-full overflow-hidden">
                <div
                  className="h-full bg-black transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

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
                  <div key={item.id} className="flex gap-6 group">
                    <div className="w-24 h-32 bg-neutral-50 overflow-hidden flex-shrink-0">
                      <img src={item.image} alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    </div>
                    <div className="flex-grow flex flex-col justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-[8px] uppercase tracking-widest text-neutral-400 mb-1">
                            {item.category}
                          </span>
                          <p className="text-sm font-light">{item.price * item.quantity} €</p>
                        </div>
                        <h3 className="font-serif italic text-lg">{item.name}</h3>
                        <div className="flex items-center border border-neutral-100 w-fit mt-4">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1, item.stock)}
                            className="p-2 hover:bg-neutral-50"
                          ><Minus size={10} strokeWidth={1} /></button>
                          <span className="text-[10px] w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1, item.stock)}
                            className="p-2 hover:bg-neutral-50"
                          ><Plus size={10} strokeWidth={1} /></button>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.id)}
                        className="flex items-center gap-2 text-[8px] uppercase tracking-widest
                          text-neutral-300 hover:text-black transition-colors mt-4">
                        <Trash2 size={10} /> Retirer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-8 border-t border-neutral-100">
              <div className="space-y-2 mb-8">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-400">Sous-total</span>
                  <span className="text-lg font-light">{total} €</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-400">Livraison</span>
                  <span className="text-[10px] uppercase tracking-widest">
                    {isFreeDelivery ? "Offerte" : deliverySettings.flatRate > 0 ? `${deliverySettings.flatRate} €` : "Calculée à l'étape suivante"}
                  </span>
                </div>
                <div className="flex justify-between items-end pt-4 border-t border-neutral-50">
                  <span className="text-[10px] uppercase tracking-widest font-bold">Total estimé</span>
                  <span className="text-2xl font-light">
                    {isFreeDelivery ? total : total + (deliverySettings.flatRate || 0)} €
                  </span>
                </div>
              </div>

              {!user && (
                <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-neutral-50 border-l-2 border-black">
                  <Lock size={12} strokeWidth={1} />
                  <span className="text-[9px] uppercase tracking-widest text-neutral-600">
                    Connexion requise pour payer
                  </span>
                </div>
              )}

              <button
                onClick={handleFinalize}
                className="w-full bg-black text-white py-6 flex items-center justify-center gap-4
                  group hover:bg-neutral-800 transition-all"
              >
                <span className="text-[10px] uppercase tracking-[0.4em]">
                  {user ? "Finaliser l'acquisition" : "Se connecter pour payer"}
                </span>
                <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
              </button>

              <p className="text-[8px] uppercase tracking-[0.2em] text-neutral-400 mt-6 text-center">
                Expédition soignée depuis l'Atelier · Stripe®
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CartDrawer;