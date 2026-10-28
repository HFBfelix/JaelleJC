'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProductImageView } from '@/server/catalog/types';

// Carrousel mobile et bouton « Retour », repris de legacy/src/pages/ProductDetail.tsx.
export const MobileGallery = ({ images, name }: { images: ProductImageView[]; name: string }) => {
  const [current, setCurrent] = useState(0);
  return (
    <div className="relative aspect-[4/5] overflow-hidden bg-neutral-50">
      {images.map((img, i) => (
        <Image
          key={img.url}
          src={img.url}
          alt={img.alt || `${name} ${i + 1}`}
          fill
          sizes="100vw"
          priority={i === 0}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i === current ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      {images.length > 1 && <>
        <button
          aria-label="Photo précédente"
          onClick={() => setCurrent((prev) => (prev - 1 + images.length) % images.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-sm"
        ><ChevronLeft size={20} strokeWidth={1} /></button>
        <button
          aria-label="Photo suivante"
          onClick={() => setCurrent((prev) => (prev + 1) % images.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-sm"
        ><ChevronRight size={20} strokeWidth={1} /></button>
      </>}
    </div>
  );
};

export const BackButton = () => {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-3 mb-12 hover:opacity-50 transition-opacity group"
    >
      <div className="h-[0.5px] w-6 bg-black group-hover:w-10 transition-all" />
      <span className="text-[9px] uppercase tracking-[0.3em]">Retour</span>
    </button>
  );
};
