import React, { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { trackEvent } from '../../lib/firebase';
import { useCart } from '../../contexts/CartContext';

interface ExitIntentPopupProps {
  cartCount: number;
}

const ExitIntentPopup: React.FC<ExitIntentPopupProps> = ({ cartCount }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);
  
  // On récupère setIsCartOpen depuis ton CartContext pour déclencher le tiroir latéral
  const { setIsCartOpen } = useCart();

  useEffect(() => {
    // On vérifie si l'utilisateur a déjà fermé la pop-up durant cette session
    const dismissed = sessionStorage.getItem('exit_popup_dismissed');
    if (dismissed) setHasBeenDismissed(true);

    const handleMouseLeave = (e: MouseEvent) => {
      // Déclenchement si : la souris sort par le haut, le panier n'est pas vide, et pas encore fermé
      if (e.clientY <= 0 && cartCount > 0 && !hasBeenDismissed && !isVisible) {
        setIsVisible(true);
        trackEvent('exit_intent_shown', { items_in_cart: cartCount });
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [cartCount, hasBeenDismissed, isVisible]);

  const closePopup = () => {
    setIsVisible(false);
    setHasBeenDismissed(true);
    sessionStorage.setItem('exit_popup_dismissed', 'true');
  };

  // Logique de finalisation : on ferme la popup et on ouvre le panier latéral
  const handleFinalizeAction = () => {
    closePopup();
    setIsCartOpen(true);
  };

  if (!isVisible) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600] animate-in fade-in duration-500" onClick={closePopup} />
      <div className="fixed inset-0 flex items-center justify-center z-[601] px-6 pointer-events-none">
        <div className="bg-white max-w-lg w-full p-12 md:p-16 relative pointer-events-auto animate-in zoom-in-95 duration-500">
          <button onClick={closePopup} className="absolute top-6 right-6 hover:rotate-90 transition-transform duration-300">
            <X size={20} strokeWidth={1} />
          </button>

          <div className="text-center">
            <span className="text-[9px] uppercase tracking-[0.5em] text-neutral-400 block mb-6">L'Atelier Jaelle & JC</span>
            <h2 className="font-serif text-3xl italic mb-6 text-neutral-800">Votre sélection vous attend</h2>
            <p className="text-[13px] text-neutral-500 leading-relaxed mb-10 font-light">
              Les pièces de notre atelier sont produites en quantités limitées. 
              Souhaitez-vous sauvegarder votre panier ou finaliser votre acquisition avant qu'elles ne s'envolent ?
            </p>

            <div className="flex flex-col gap-4">
              <button 
                onClick={handleFinalizeAction}
                className="w-full bg-black text-white py-5 text-[10px] uppercase tracking-[0.4em] flex items-center justify-center gap-4 hover:bg-neutral-800 transition-all"
              >
                Finaliser maintenant <ArrowRight size={14} />
              </button>
              <button 
                onClick={closePopup}
                className="text-[9px] uppercase tracking-widest text-neutral-400 hover:text-black transition-colors py-2"
              >
                Continuer mes explorations
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExitIntentPopup;