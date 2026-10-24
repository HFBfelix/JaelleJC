import React from 'react';

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-white pt-32 pb-24 px-6 font-sans antialiased text-justify">
    <div className="max-w-3xl mx-auto text-[13px] text-neutral-600 leading-relaxed">
      <h1 className="font-serif text-3xl italic mb-12 text-black">Politique de Confidentialité</h1>
      
      <section className="mb-10">
        <p className="mb-6">
          L'entreprise <strong>Jaelle & JC</strong> s’engage à traiter les données personnelles collectées en conformité avec la règlementation en vigueur sur le territoire français. Dans ce cadre, l'entreprise Jaelle & JC s’engage, sauf exceptions prévues par la loi, à obtenir le consentement du client chaque fois qu’elle collecte une donnée à caractère personnel le concernant (par exemple à l’aide de cookies).
        </p>
        <p className="mb-6">
          Ces données sont collectées et traitées à des fins de gestion client, de fidélisation et de promotion, de statistiques, de gestion des impayés, du contentieux et des avis clients. Elles sont conservées pendant la durée strictement nécessaire pour l’accomplissement de ces finalités et ne sont jamais communiquées à des tiers, sauf si cela est nécessaire afin de respecter les lois et règlementations applicables, répondre à une assignation, à un mandat de perquisition ou à toute autre demande légale de renseignements que nous recevons, ou pour protéger nos droits.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-black mb-4 italic">Cookies et traceurs</h2>
        <p className="mb-4">
          Conformément aux recommandations de la CNIL, certains Cookies sont dispensés du recueil préalable de consentement, lorsqu'ils sont strictement nécessaires au fonctionnement du site internet ou ont pour finalité exclusive de permettre ou faciliter la communication par voie électronique. Il s'agit en particulier des Cookies d’identifiant de session, d’authentification, de session d’équilibrage de charge ainsi que des cookies de personnalisation de votre interface.
        </p>
        <p className="mb-4">
          Le client dispose d’un droit de retrait de son consentement, de portabilité, d’accès, de rectification, de mise à jour et de suppression de ses données qu’il peut exercer en s’adressant au service clientèle de l'entreprise Jaelle & JC à l'adresse <strong>contact@jaellejc.com</strong>.
        </p>
        <p>
          Le client a la possibilité de paramétrer, bloquer ou supprimer les cookies installés sur leurs terminaux en configurant les options de leur navigateur selon les préconisations de la CNIL disponibles ici : <a href="https://www.cnil.fr/fr/cookies-les-outils-pour-les-maitriser" className="underline">https://www.cnil.fr/fr/cookies-les-outils-pour-les-maitriser</a>.
        </p>
      </section>
    </div>
  </div>
);

export default PrivacyPolicy;