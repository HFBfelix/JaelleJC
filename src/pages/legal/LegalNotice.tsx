import React from 'react';

const LegalNotice = () => (
  <div className="min-h-screen bg-white pt-32 pb-24 px-6 font-sans antialiased">
    <div className="max-w-2xl mx-auto">
      <span className="text-[9px] uppercase tracking-[0.5em] text-neutral-400 block mb-4">Jaelle & JC</span>
      <h1 className="font-serif text-4xl italic mb-16">Mentions légales</h1>

      <div className="space-y-12 text-[13px] text-neutral-600 leading-relaxed">

        <section>
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-black font-medium mb-4 italic">Éditeur du site</h2>
          <p>Le site jaellejc.com est édité par :</p>
          <p className="mt-2 font-serif italic text-black text-base">H-AI.studio</p>
          <p>Responsable : Félix HAMILTON</p>
          <p>SIRET : 51385694800031</p>
          <p>Email : contact@h-ai.studio</p>
        </section>

        <div className="w-full h-[0.5px] bg-neutral-100" />

        <section>
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-black font-medium mb-4 italic">Hébergement</h2>
          <p>Ce site est hébergé par :</p>
          <p className="mt-2 font-medium text-black">OVHcloud</p>
          <p>Adresse : 2 RUE KELLERMANN 59100 ROUBAIX, France</p>
        </section>

        <div className="w-full h-[0.5px] bg-neutral-100" />

        <section>
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-black font-medium mb-4 italic">Propriété intellectuelle</h2>
          <p>
            L'ensemble des contenus présents sur ce site (textes, images, photographies, logos) est la propriété exclusive de l'entreprise Jaelle & JC et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
          </p>
        </section>

        <div className="w-full h-[0.5px] bg-neutral-100" />

        <section>
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-black font-medium mb-4 italic">Données personnelles</h2>
          <p>
            Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour exercer ce droit : <a href="mailto:contact@jaellejc.com" className="border-b border-neutral-300 hover:border-black transition-colors">contact@jaellejc.com</a>
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