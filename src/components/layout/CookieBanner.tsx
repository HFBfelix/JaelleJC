'use client';

import { useEffect, useState } from 'react';
import { readConsent, writeConsent, type Consent } from '@/lib/consent';

// Repris à l'identique de legacy/src/components/layout/CookieBanner.tsx (décision de Jaelle, 2026-10-24).
const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Lecture du navigateur après le premier rendu : le HTML serveur ne connaît pas le choix.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!readConsent(window.localStorage)) setIsVisible(true);
  }, []);

  const handleAction = (choice: Consent) => {
    writeConsent(window.localStorage, choice);
    setIsVisible(false);
    if (choice === 'all') window.location.reload();
  };

  // Si on a déjà consenti, on ne rend RIEN (pas de div fantôme)
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="bg-white max-w-lg w-full p-10 shadow-2xl border border-neutral-100 text-center">
        <h2 className="font-serif text-2xl uppercase tracking-widest mb-6">Confidentialité</h2>
        <p className="text-[12px] leading-relaxed text-neutral-500 mb-8">
          Bienvenue sur jaellejc.com. Nous utilisons des cookies pour améliorer votre expérience.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleAction('all')}
            className="w-full bg-black text-white py-4 text-[10px] uppercase tracking-[0.3em] hover:bg-neutral-800"
          >
            Tout accepter
          </button>
          <button
            onClick={() => handleAction('none')}
            className="w-full border border-black py-4 text-[10px] uppercase tracking-[0.3em] hover:bg-neutral-50"
          >
            Continuer sans accepter
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
