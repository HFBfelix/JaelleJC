import React from 'react';

const PrivacyPolicy = () => (
  <div className="max-w-4xl mx-auto pt-32 pb-20 px-6 font-light leading-relaxed text-[13px] text-neutral-600">
    <h1 className="font-serif text-3xl italic mb-12 text-black">Politique de Confidentialité</h1>
    
    <section className="mb-8">
      <p className="mb-6">
        L'entreprise Jaelle & JC s’engage à traiter les données personnelles collectées en conformité avec la règlementation en vigueur sur le territoire français. 
        Jaelle & JC s’engage à obtenir le consentement du client chaque fois qu’elle collecte une donnée à caractère personnel le concernant (par exemple à l’aide de cookies).
      </p>
      <p className="mb-6">
        Ces données sont collectées à des fins de gestion client, de fidélisation et de promotion, de statistiques, de gestion des impayés, du contentieux et des avis clients. Elles sont conservées pendant la durée strictement nécessaire pour l’accomplissement de ces finalités et ne sont jamais communiquées à des tiers, sauf obligation légale.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-black mb-4 italic">Cookies et traceurs</h2>
      <p className="mb-4">
        Conformément aux recommandations de la CNIL, certains Cookies sont dispensés du recueil préalable de consentement lorsqu'ils sont strictement nécessaires au fonctionnement du site. Pour les autres, Jaelle & JC s’assure d’obtenir le consentement au moyen d’une fenêtre (pop up).
      </p>
      <p className="mb-6">
        Le client a la possibilité de paramétrer, bloquer ou supprimer les cookies de son navigateur selon les préconisations de la CNIL disponibles ici : https://www.cnil.fr/fr/cookies-les-outils-pour-les-maitriser.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-black mb-4 italic">Vos Droits</h2>
      <p>
        Le client dispose d’un droit de retrait de son consentement, de portabilité, d’accès, de rectification, de mise à jour et de suppression de ses données qu’il peut exercer en s’adressant au service clientèle de l'entreprise Jaelle & JC à l'adresse <strong>contact@jaellejc.com</strong>.
      </p>
    </section>
  </div>
);

export default PrivacyPolicy;