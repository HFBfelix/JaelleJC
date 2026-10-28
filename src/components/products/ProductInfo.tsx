'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { ProductView } from '@/server/catalog/types';

// Citation et rubriques de la fiche (style repris de legacy/src/pages/ProductDetail.tsx).
// Les anciennes descriptions sont réparties par la migration (demande de Jaelle du 2026-10-24) :
// citation = accroche ; rubriques = description, matières et entretien, dimensions et détails.
// Une rubrique sans contenu n'est pas affichée (plus de texte de remplissage non prouvé).
type Section = { key: string; label: string; lines: string[] };

export function productSections(product: ProductView): Section[] {
  const materials = product.materials.join(', ');
  const care = [materials, product.entretien].filter(Boolean).join(' — ');
  const sections: Section[] = [];
  if (product.accroche && product.description) sections.push({ key: 'description', label: 'Description', lines: [product.description] });
  if (care) sections.push({ key: 'matieres', label: 'Matières & Entretien', lines: [care] });
  if (product.details.length) sections.push({ key: 'dimensions', label: 'Dimensions & détails', lines: product.details });
  sections.push({
    key: 'livraison',
    label: 'Livraison & Retours',
    lines: ['Expédition offerte en France métropolitaine. Chaque pièce est préparée à la main dans notre atelier.'],
  });
  return sections;
}

export const ProductQuote = ({ product }: { product: ProductView }) => {
  const quote = product.accroche || product.description;
  if (!quote) return null;
  return (
    <div className="border-l border-black pl-5 mb-10">
      <p className="text-[13px] leading-relaxed text-neutral-700 font-light italic">
        &quot;{quote}&quot;
      </p>
    </div>
  );
};

export const ProductAccordions = ({ product }: { product: ProductView }) => {
  const [active, setActive] = useState<string | null>(null);
  return (
    <>
      {productSections(product).map(({ key, label, lines }) => (
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
