import React from 'react';

const LegalNotice = () => {
  return (
    <div className="min-h-screen bg-white pt-32 pb-24 px-6 md:px-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl italic mb-12 border-b border-neutral-100 pb-6">Mentions Légales</h1>
        <div className="text-sans text-[14px] leading-relaxed text-neutral-600 space-y-6">
          <p>Contenu des mentions légales...</p>
        </div>
      </div>
    </div>
  );
};

// CETTE LIGNE EST INDISPENSABLE :
export default LegalNotice;