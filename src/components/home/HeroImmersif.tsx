'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// Rendu repris de legacy/src/components/home/HeroImmersif.tsx. Les liens « Découvrir la pièce »
// arrivent du serveur (adresse /produits/<slug> du produit publié, ou la collection à défaut).
export type HeroSlide = {
  title: string;
  subtitle: string;
  images: [string, string];
  description: string;
  lightness: 'high' | 'medium';
  href: string;
};

const HeroImmersif = ({ slides }: { slides: HeroSlide[] }) => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const router = useRouter();

  // Cycle principal des produits (8 secondes)
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
      setSubIndex(0);
    }, 8000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Transition interne vers la deuxième photo (4 secondes)
  useEffect(() => {
    const subTimer = setTimeout(() => setSubIndex(1), 4000);
    return () => clearTimeout(subTimer);
  }, [index]);

  const slide = slides[index];
  if (!slide) return null;

  return (
    <section className="h-[85vh] md:h-[95vh] w-full overflow-hidden relative bg-black">

      <AnimatePresence mode="popLayout">
        <motion.div
          key={`${index}-${subIndex}`}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1.03 }}
          exit={{ opacity: 0, scale: 1 }}
          transition={{ duration: 2.5, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={slide.images[subIndex === 1 ? 1 : 0]}
            alt={slide.subtitle}
            fill
            sizes="100vw"
            priority={index === 0 && subIndex === 0}
            className={`w-full h-full object-cover ${
              slide.lightness === 'high' ? 'brightness-[0.75]' : 'brightness-[0.85]'
            }`}
          />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent z-10" />

      <div className="absolute inset-0 z-20 pointer-events-none opacity-30">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle cx="20" cy="30" r="0.15" fill="white" className="animate-pulse" />
          <circle cx="75" cy="20" r="0.1" fill="white" className="animate-pulse delay-1000" />
          <motion.path
            d="M50,45 Q55,40 50,35 Q45,40 50,45"
            fill="white"
            animate={{ y: [0, 20, 0], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          />
        </svg>
      </div>

      <div className="absolute inset-0 z-30 flex flex-col justify-end px-8 md:px-24 pb-20 md:pb-28 text-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          >
            <span className="text-[11px] uppercase tracking-[0.12em] mb-4 block opacity-70">
              {slide.title}
            </span>

            <h2 className="font-serif text-5xl md:text-8xl mb-8 leading-tight">
              {slide.subtitle}
            </h2>

            <p className="text-[12px] md:text-sm opacity-50 max-w-xs mb-12">
              {slide.description}
            </p>

            <button
              onClick={() => router.push(slide.href)}
              className="group flex items-center gap-8 active:scale-95 transition-transform"
            >
              <span className="text-[11px] uppercase tracking-[0.12em]">Découvrir la pièce</span>
              <div className="h-[0.5px] w-12 bg-white group-hover:w-24 transition-all duration-1000" />
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-12 right-12 z-40 flex items-center gap-8">
        <div className="flex gap-4">
          {slides.map((_, i) => (
            <div key={i} className="h-[1px] w-12 bg-white/20 relative overflow-hidden">
              {i === index && (
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '0%' }}
                  transition={{ duration: 8, ease: 'linear' }}
                  className="absolute inset-0 bg-white"
                />
              )}
            </div>
          ))}
        </div>
        <span className="text-white/40 text-[11px] tracking-[0.12em] uppercase">
          0{index + 1} / 0{slides.length}
        </span>
      </div>

    </section>
  );
};

export default HeroImmersif;
