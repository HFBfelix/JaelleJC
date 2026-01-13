import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white border-t-[0.5px] border-neutral-200 pt-20 pb-10 px-6 md:px-12">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          
          {/* Colonne 1 : La Maison */}
          <div className="flex flex-col gap-4">
            <h3 className="font-serif italic text-lg mb-2">Maison Jaelle & JC</h3>
            <p className="text-sans text-[13px] leading-relaxed text-neutral-500 max-w-[200px]">
              Basiques & Intemporels. Confection artisanale française.
            </p>
          </div>

          {/* Colonne 2 : Service Client */}
          <div className="flex flex-col gap-3">
            <span className="text-sans text-[11px] uppercase tracking-[0.2em] mb-2 text-black">Service Client</span>
            <Link to="/contact" className="text-sans text-[13px] text-neutral-500 hover:text-black transition-colors">Contact</Link>
            <Link to="/legal/shipping-refund" className="text-sans text-[13px] text-neutral-500 hover:text-black transition-colors">Livraison & Retours</Link>
            <Link to="/legal/terms" className="text-sans text-[13px] text-neutral-500 hover:text-black transition-colors">CGV</Link>
          </div>

          {/* Colonne 3 : Informations */}
          <div className="flex flex-col gap-3">
            <span className="text-sans text-[11px] uppercase tracking-[0.2em] mb-2 text-black">Informations</span>
            <Link to="/legal/privacy" className="text-sans text-[13px] text-neutral-500 hover:text-black transition-colors">Confidentialité</Link>
            <Link to="/legal/notice" className="text-sans text-[13px] text-neutral-500 hover:text-black transition-colors">Mentions Légales</Link>
          </div>

          {/* Colonne 4 : Newsletter (Brevo Integration Ready) */}
          <div className="flex flex-col gap-4">
            <span className="text-sans text-[11px] uppercase tracking-[0.2em] mb-2 text-black">Newsletter</span>
            <div className="relative border-b-[0.5px] border-neutral-300 pb-2">
              <input 
                type="email" 
                placeholder="Votre adresse email" 
                className="w-full bg-transparent text-sans text-[13px] outline-none placeholder:text-neutral-300"
              />
              <button className="absolute right-0 top-0 text-sans text-[11px] uppercase tracking-[0.1em] hover:opacity-50">
                S'inscrire
              </button>
            </div>
          </div>
        </div>

        {/* Bas du Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-10 border-t-[0.5px] border-neutral-100">
          <img 
            src="/assets/logo.png" 
            alt="Jaelle & JC" 
            className="h-5 opacity-30 grayscale contrast-125"
          />
          <p className="text-sans text-[10px] uppercase tracking-[0.1em] text-neutral-400">
            © {currentYear} Jaelle & JC — Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;