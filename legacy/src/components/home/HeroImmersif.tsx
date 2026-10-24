import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SLIDES = [
  {
    // ID Firestore : cabas bleu
    id: 'giDoycYl8m1OYehLlws8', 
    title: "L'élégance du coton",
    subtitle: "le cabas imprimé bleu",
    images: ["/assets/cabasbleu3.webp", "/assets/cabas_bleu_2.webp"],
    description: "Une silhouette intemporelle pour vos journées ensoleillées.",
    lightness: "high"
  },
  {
    // ID Firestore : coffret blanc pétales
    id: 'MnXZRalzF37is34LXPmx',
    title: "Poésie de naissance",
    subtitle: "le coffret blanc pétales",
    images: ["/assets/IMG_4836.webp", "/assets/IMG_4869.webp"],
    description: "Un semis de fleurs bleues pour accueillir la vie avec douceur.",
    lightness: "medium"
  },
  {
    // ID Firestore : couverture pétales
    id: 'u1Y3BBm5r2omFnYsFFhn',
    title: "Douceur d'atelier",
    subtitle: "la couverture pétales",
    images: ["/assets/IMG_4826.webp", "/assets/IMG_4831.webp"],
    description: "Le raffinement du coton blanc et l'éclat des pétales azur.",
    lightness: "high"
  }
];

const HeroImmersif = () => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const navigate = useNavigate();

  // Cycle principal des produits (8 secondes)
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDES.length);
      setSubIndex(0);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  // Transition interne vers la deuxième photo (4 secondes)
  useEffect(() => {
    const subTimer = setTimeout(() => setSubIndex(1), 4000);
    return () => clearTimeout(subTimer);
  }, [index]);

  return (
    <section className="h-[85vh] md:h-[95vh] w-full overflow-hidden relative bg-black">
      
      {/* 1. SYSTÈME D'IMAGES AVEC TRANSITIONS SMOOTH (FRAMER MOTION) */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={`${index}-${subIndex}`}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1.03 }}
          exit={{ opacity: 0, scale: 1 }}
          transition={{ duration: 2.5, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          <img
            src={SLIDES[index].images[subIndex]}
            alt={SLIDES[index].subtitle}
            className={`w-full h-full object-cover ${
              SLIDES[index].lightness === 'high' ? 'brightness-[0.75]' : 'brightness-[0.85]'
            }`}
          />
        </motion.div>
      </AnimatePresence>

      {/* 2. GRADIENT DE PROTECTION DU TEXTE */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent z-10" />

      {/* 3. CALQUE SVG : ANIMATION DISCRÈTE */}
      <div className="absolute inset-0 z-20 pointer-events-none opacity-30">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle cx="20" cy="30" r="0.15" fill="white" className="animate-pulse" />
          <circle cx="75" cy="20" r="0.1" fill="white" className="animate-pulse delay-1000" />
          <motion.path 
            d="M50,45 Q55,40 50,35 Q45,40 50,45" 
            fill="white"
            animate={{ y: [0, 20, 0], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          />
        </svg>
      </div>

      {/* 4. TEXTES ET REDIRECTION PRODUIT */}
      <div className="absolute inset-0 z-30 flex flex-col justify-end px-8 md:px-24 pb-20 md:pb-28 text-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            <span className="text-[10px] uppercase tracking-[0.6em] mb-4 block opacity-70 italic font-serif">
              {SLIDES[index].title}
            </span>
            
            <h2 className="font-serif italic text-5xl md:text-8xl mb-8 lowercase leading-tight">
              {SLIDES[index].subtitle}
            </h2>

            <p className="text-[12px] md:text-sm font-light italic opacity-50 max-w-xs mb-12">
              {SLIDES[index].description}
            </p>
            
            <button
              onClick={() => navigate(`/product/${SLIDES[index].id}`)}
              className="group flex items-center gap-8 active:scale-95 transition-transform"
            >
              <span className="text-[10px] uppercase tracking-[0.4em]">Découvrir la pièce</span>
              <div className="h-[0.5px] w-12 bg-white group-hover:w-24 transition-all duration-1000" />
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 5. INDICATEURS DE PROGRESSION */}
      <div className="absolute bottom-12 right-12 z-40 flex items-center gap-8">
        <div className="flex gap-4">
          {SLIDES.map((_, i) => (
            <div key={i} className="h-[1px] w-12 bg-white/20 relative overflow-hidden">
              {i === index && (
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "0%" }}
                  transition={{ duration: 8, ease: "linear" }}
                  className="absolute inset-0 bg-white"
                />
              )}
            </div>
          ))}
        </div>
        <span className="text-white/40 text-[9px] tracking-[0.4em] font-serif italic uppercase">
          0{index + 1} / 03
        </span>
      </div>

    </section>
  );
};

export default HeroImmersif;