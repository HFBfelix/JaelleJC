'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { ProductSection } from '@/server/catalog/types';

// Citation et rubriques de la fiche (style repris de legacy/src/pages/ProductDetail.tsx).
// Le contenu est calculé côté serveur (src/server/catalog/mapping.ts) : ce composant ne reçoit que le texte affiché.
export const ProductQuote = ({ quote }: { quote: string }) => {
  if (!quote) return null;
  return (
    <div className="border-l border-black pl-5 mb-10">
      <p className="text-[13px] leading-relaxed text-neutral-700 font-light italic">
        &quot;{quote}&quot;
      </p>
    </div>
  );
};

export const ProductAccordions = ({ sections }: { sections: ProductSection[] }) => {
  const [active, setActive] = useState<string | null>(null);
  return (
    <>
      {sections.map(({ key, label, lines }) => (
        <div key={key} className="border-t-[0.5px] border-neutral-100">
          <button
            onClick={() => setActive(active === key ? null : key)}
            aria-expanded={active === key}
            className="w-full py-4 flex justify-between items-center group"
          >
            <span className="text-[9px] uppercase tracking-widest text-neutral-500 group-hover:text-black transition-colors">
              {label}
            </span>
            <Plus
              size={12}
              strokeWidth={1}
              className={`transition-transform duration-300 ${active === key ? 'rotate-45' : ''}`}
            />
          </button>
          {/* Contenu toujours présent dans le HTML (lisible par les moteurs), replié visuellement. */}
          <div className={`overflow-hidden transition-all duration-300 ${active === key ? 'max-h-96 pb-6' : 'max-h-0'}`}>
            {lines.map((line, i) => (
              <p key={i} className="text-[11px] leading-relaxed text-neutral-500 font-light italic">
                {line}
              </p>
            ))}
          </div>
        </div>
      ))}
    </>
  );
};
