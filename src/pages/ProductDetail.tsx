import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import ProductCard from '../components/products/ProductCard';
import { useCart } from '../contexts/CartContext';
import BuyButton from '../components/products/BuyButton';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<any>(null);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  useEffect(() => {
    const fetchProductData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const docRef = doc(db, "produits", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const currentData = { id: docSnap.id, ...docSnap.data() };
          setProduct(currentData);

          const q = query(
            collection(db, "produits"),
            where("category", "==", currentData.category),
            limit(10)
          );

          const querySnapshot = await getDocs(q);
          const related = querySnapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => p.id !== id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 4);

          setSimilarProducts(related);
        }
      } catch (error) {
        console.error("Erreur Firebase:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProductData();
  }, [id]);

  if (loading || !product) return (
    <div className="h-screen flex items-center justify-center font-serif italic text-neutral-400 text-xl">
      Jaelle & JC…
    </div>
  );

  const images = product.images || [];

  return (
    <div className="bg-white font-sans antialiased">
      <style>
        {`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}
      </style>

      {/* ── VUE MOBILE ── */}
      <div className="lg:hidden">
        <div className="relative aspect-[4/5] overflow-hidden bg-neutral-50">
          {images.map((img: string, i: number) => (
            <img
              key={i}
              src={img}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i === currentImageIndex ? 'opacity-100' : 'opacity-0'}`}
              alt=""
            />
          ))}
          {images.length > 1 && <>
            <button
              onClick={() => setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-sm"
            ><ChevronLeft size={20} strokeWidth={1} /></button>
            <button
              onClick={() => setCurrentImageIndex(prev => (prev + 1) % images.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-sm"
            ><ChevronRight size={20} strokeWidth={1} /></button>
          </>}
        </div>
        <div className="px-6 py-8">
          <span className="text-[9px] uppercase tracking-[0.4em] text-neutral-500 mb-2 block">{product.category}</span>
          <h1 className="font-serif text-3xl italic mb-4">{product.name}</h1>
          <p className="text-lg font-light mb-8">{product.price} €</p>

          {/* MOBILE : un seul BuyButton */}
          <BuyButton product={product} onNeedLogin={() => setLoginOpen(true)} />
        </div>
      </div>

      {/* ── VUE DESKTOP ── */}
      <div className="hidden lg:flex" style={{ height: '100vh' }}>
        {/* COLONNE GAUCHE : IMAGES */}
        <div
          className="w-[62%] overflow-y-scroll no-scrollbar"
          style={{ scrollSnapType: 'y mandatory', height: '100vh' }}
        >
          {images.map((img: string, i: number) => (
            <div
              key={i}
              style={{ scrollSnapAlign: 'start', height: '100vh' }}
              className="relative overflow-hidden bg-neutral-50"
            >
              <img
                src={img}
                alt={`${product.name} ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-8 left-8 text-[9px] uppercase tracking-[0.3em] text-white/60">
                {String(i + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
              </div>
            </div>
          ))}
        </div>

        {/* COLONNE DROITE : INFOS */}
        <div className="w-[38%] h-screen flex flex-col justify-center px-12 xl:px-16 border-l border-neutral-100 overflow-y-auto">
          <div className="max-w-sm mx-auto w-full py-12">

            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-3 mb-12 hover:opacity-50 transition-opacity group"
            >
              <div className="h-[0.5px] w-6 bg-black group-hover:w-10 transition-all" />
              <span className="text-[9px] uppercase tracking-[0.3em]">Retour</span>
            </button>

            <span className="text-[9px] uppercase tracking-[0.5em] text-neutral-500 block mb-3">
              {product.category} {product.subCategory && `— ${product.subCategory}`}
            </span>
            <h1 className="font-serif text-3xl xl:text-4xl italic leading-tight mb-4 lowercase">
              {product.name}
            </h1>
            <p className="text-sm font-light tracking-[0.2em] mb-10 text-neutral-800">
              {product.price} €
            </p>

            <div className="border-l border-black pl-5 mb-10">
              <p className="text-[13px] leading-relaxed text-neutral-700 font-light italic">
                "{product.description}"
              </p>
            </div>

            {/* DESKTOP : un seul BuyButton — suppression du doublon en bas */}
            <div className="mb-10">
              <BuyButton product={product} onNeedLogin={() => setLoginOpen(true)} />
            </div>

            {/* ACCORDÉONS */}
            {[
              {
                key: 'matieres',
                label: 'Matières & Entretien',
                content: `${product.matieres || "Matières nobles sélectionnées par l'Atelier."} — ${product.entretien || 'Entretien délicat préconisé.'}`
              },
              {
                key: 'dimensions',
                label: 'Dimensions & détails',
                content: product.dimensions || 'Dimensions ajustées pour un porté idéal.'
              },
              {
                key: 'livraison',
                label: 'Livraison & Retours',
                content: 'Expédition offerte en France métropolitaine. Chaque pièce est préparée à la main dans notre atelier.'
              }
            ].map(({ key, label, content }) => (
              <div key={key} className="border-t-[0.5px] border-neutral-100">
                <button
                  onClick={() => setActiveAccordion(activeAccordion === key ? null : key)}
                  className="w-full py-4 flex justify-between items-center group"
                >
                  <span className="text-[9px] uppercase tracking-widest text-neutral-500 group-hover:text-black transition-colors">
                    {label}
                  </span>
                  <Plus
                    size={12}
                    strokeWidth={1}
                    className={`transition-transform duration-300 ${activeAccordion === key ? 'rotate-45' : ''}`}
                  />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${activeAccordion === key ? 'max-h-48 pb-6' : 'max-h-0'}`}>
                  <p className="text-[11px] leading-relaxed text-neutral-500 font-light italic">
                    {content}
                  </p>
                </div>
              </div>
            ))}

            {/* ─── SUPPRIMÉ : le second bouton "Ajouter au panier" qui doublonnait BuyButton ─── */}

          </div>
        </div>
      </div>

      {/* ── SECTION RÉSONANCES ESTHÉTIQUES ── */}
      {similarProducts.length > 0 && (
        <div className="px-6 md:px-16 py-32 border-t-[0.5px] border-neutral-100 bg-neutral-50/20">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-col items-center mb-20 text-center">
              <span className="text-[9px] uppercase tracking-[0.6em] text-neutral-400 mb-4 italic">Poursuivre la découverte</span>
              <h2 className="font-serif text-3xl italic text-black">Résonances Esthétiques</h2>
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mt-2 italic">
                D'autres créations de l'univers {product.category}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 xl:gap-16 mb-20">
              {similarProducts.map((p) => (
                <div key={p.id} className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>

            <div className="flex justify-center mt-20">
              <button
                onClick={() => navigate(`/collection?category=${product.category}`)}
                className="group flex flex-col items-center gap-4"
              >
                <span className="text-[10px] uppercase tracking-[0.5em] text-black group-hover:opacity-50 transition-opacity">
                  Découvrir toute la collection {product.category}
                </span>
                <div className="h-[0.5px] w-24 bg-black group-hover:w-40 transition-all duration-700 opacity-20" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;