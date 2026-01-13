import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Mail } from 'lucide-react';

const Success = () => {
  useEffect(() => {
    // C'est ici que nous placerons plus tard l'appel à src/lib/brevo.ts
    // pour envoyer l'email de confirmation automatique.
    console.log("Déclenchement de l'email de confirmation via Brevo...");
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="max-w-xl w-full text-center flex flex-col items-center">
        {/* Icône de succès discrète */}
        <div className="mb-8 text-neutral-200">
          <CheckCircle2 size={60} strokeWidth={0.5} />
        </div>

        <span className="text-sans text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-4">
          Paiement Confirmé
        </span>
        
        <h1 className="font-serif text-4xl md:text-5xl italic mb-8">
          Merci pour votre confiance.
        </h1>

        <div className="h-[0.5px] w-12 bg-neutral-200 mb-8"></div>

        <p className="text-sans text-[13px] leading-relaxed text-neutral-500 mb-12 max-w-md">
          Votre commande a été enregistrée avec succès. Un email de confirmation contenant les détails de votre acquisition et les informations de livraison vous a été envoyé.
        </p>

        <div className="flex flex-col md:flex-row gap-6 items-center">
          <Link 
            to="/" 
            className="text-sans text-[11px] uppercase tracking-[0.2em] border-b-[0.5px] border-black pb-1 hover:opacity-50 transition-opacity"
          >
            Retourner à la Maison
          </Link>
          
          <div className="flex items-center gap-2 text-sans text-[11px] uppercase tracking-[0.2em] text-neutral-400 italic">
            <Mail size={14} strokeWidth={1} />
            <span>Des questions ? Contactez-nous</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Success;