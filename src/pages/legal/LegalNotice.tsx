import React from 'react';

const LegalNotice = () => (
  <div className="min-h-screen bg-white pt-32 pb-24 px-6 font-sans antialiased">
    <div className="max-w-2xl mx-auto">
      <span className="text-[9px] uppercase tracking-[0.5em] text-neutral-400 block mb-4">Jaelle & JC</span>
      <h1 className="font-serif text-4xl italic mb-16">Mentions légales</h1>

      <div className="space-y-12 text-[13px] text-neutral-600 leading-relaxed">

        <section>
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-black font-medium mb-4">Éditeur du site</h2>
          <p>Le site jaellejc.web.app est édité par :</p>
          <p className="mt-2 font-serif italic">Atelier Jaelle & JC</p>
          <p>Île-de-France, France</p>
          <p>Email : contact@jaellejc.com</p>
        </section>

        <div className="w-full h-[0.5px] bg-neutral-100" />

        <section>
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-black font-medium mb-4">Hébergement</h2>
          <p>Ce site est hébergé par :</p>
          <p className="mt-2">Google Firebase — Google LLC</p>
          <p>1600 Amphitheatre Parkway, Mountain View, CA 94043, USA</p>
        </section>

        <div className="w-full h-[0.5px] bg-neutral-100" />

        <section>
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-black font-medium mb-4">Propriété intellectuelle</h2>
          <p>
            L'ensemble des contenus présents sur ce site (textes, images, photographies, logos) est la propriété exclusive de l'Atelier Jaelle & JC et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
          </p>
          <p className="mt-4">
            Toute reproduction, représentation, modification ou adaptation, totale ou partielle, de ces éléments est strictement interdite sans l'accord préalable et écrit de l'Atelier Jaelle & JC.
          </p>
        </section>

        <div className="w-full h-[0.5px] bg-neutral-100" />

        <section>
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-black font-medium mb-4">Données personnelles</h2>
          <p>
            Les informations collectées lors de votre inscription ou de votre commande sont nécessaires au traitement de celle-ci et sont destinées exclusivement à l'Atelier Jaelle & JC. Conformément à la loi Informatique et Libertés du 6 janvier 1978 et au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données.
          </p>
          <p className="mt-4">Pour exercer ce droit : <a href="mailto:contact@jaellejc.com" className="border-b border-neutral-300 hover:border-black transition-colors">contact@jaellejc.com</a></p>
        </section>

        <div className="w-full h-[0.5px] bg-neutral-100" />

        <section>
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-black font-medium mb-4">Cookies</h2>
          <p>
            Ce site utilise des cookies techniques nécessaires à son bon fonctionnement (authentification, panier). Aucun cookie à des fins publicitaires ou de traçage tiers n'est utilisé.
          </p>
        </section>

        <div className="w-full h-[0.5px] bg-neutral-100" />

        <section>
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-black font-medium mb-4">Responsabilité</h2>
          <p>
            L'Atelier Jaelle & JC s'efforce de maintenir les informations de ce site à jour et exactes, mais ne saurait être tenu responsable des erreurs ou omissions, ni des dommages résultant de l'utilisation du site.
          </p>
        </section>

        <p className="text-[9px] uppercase tracking-widest text-neutral-300 pt-8">
          Dernière mise à jour : Mars 2026
        </p>
      </div>
    </div>
  </div>
);

export default LegalNotice;