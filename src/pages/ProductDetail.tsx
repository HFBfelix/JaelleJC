import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, limit, getDocs } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import ProductCard from '../components/products/ProductCard';
import { useCart } from '../contexts/CartContext'; // IA : Hook Panier

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart(); // IA : Fonction d'ajout

  const [product, setProduct] = useState<any>(null);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  useEffect(() => {
    const fetchProductData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const docRef = doc(db, "produits", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() });
          const q = query(collection(db, "produits"), limit(6));
          const querySnapshot = await getDocs(q);
          const related = querySnapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => p.id !== id)
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
    <div className="bg-white">

      {/* VUE MOBILE */}
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
            ><ChevronLeft size={20} /></button>
            <button
              onClick={() => setCurrentImageIndex(prev => (prev + 1) % images.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-sm"
            ><ChevronRight size={20} /></button>
          </>}
        </div>
        <div className="px-6 py-8">
          <span className="text-[9px] uppercase tracking-[0.4em] text-neutral-400 mb-2 block">{product.category}</span>
          <h1 className="font-serif text-3xl italic mb-4">{product.name}</h1>
          <p className="text-lg font-light mb-8">{product.price}€</p>
          
          {/* IA : Ajout au panier mobile */}
          <button 
            onClick={() => addToCart(product)}
            className="block w-full bg-black text-white py-4 text-center text-[10px] uppercase tracking-[0.3em]"
          >
            Acquérir cette pièce
          </button>
        </div>
      </div>

      {/* VUE DESKTOP */}
      <div className="hidden lg:flex" style={{ height: '100vh' }}>

        {/* ── COLONNE GAUCHE : SCROLL SNAP ── */}
        <div
          className="w-[62%] overflow-y-scroll"
          style={{
            scrollSnapType: 'y mandatory',
            height: '100vh',
          }}
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

        {/* ── COLONNE DROITE : STICKY ── */}
        <div className="w-[38%] h-screen flex flex-col justify-center px-12 xl:px-16 border-l border-neutral-100 overflow-y-auto">
          <div className="max-w-sm mx-auto w-full">

            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-3 mb-12 hover:opacity-50 transition-opacity group"
            >
              <div className="h-[0.5px] w-6 bg-black group-hover:w-10 transition-all" />
              <span className="text-[9px] uppercase tracking-[0.3em]">Collection</span>
            </button>

            <span className="text-[9px] uppercase tracking-[0.5em] text-neutral-400 block mb-3">
              {product.category}
            </span>
            <h1 className="font-serif text-3xl xl:text-4xl italic leading-tight mb-4 lowercase">
              {product.name}
            </h1>
            <p className="text-sm font-light tracking-[0.2em] mb-10">
              {product.price} €
            </p>

            <div className="border-l border-black pl-5 mb-10">
              <p className="text-[13px] leading-relaxed text-neutral-700 font-light italic">
                "{product.description}"
              </p>
            </div>

            {[
              {
                key: 'matieres',
                label: 'Matières & Entretien',
                content: product.promises?.material || 'Matière naturelle — lavage délicat à la main.'
              },
              {
                key: 'livraison',
                label: 'Livraison & Retours',
                content: 'Expédition offerte en France métropolitaine. Retours acceptés sous 14 jours.'
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
                <div className={`overflow-hidden transition-all duration-300 ${activeAccordion === key ? 'max-h-32 pb-4' : 'max-h-0'}`}>
                  <p className="text-[11px] leading-relaxed text-neutral-500">{content}</p>
                </div>
              </div>
            ))}

            <div className="border-t-[0.5px] border-neutral-100 pt-8 mt-2">
              <button
                onClick={() => addToCart(product)} // IA : Ajout au panier desktop
                className="block w-full bg-black text-white py-5 text-[10px] uppercase tracking-[0.4em] text-center hover:bg-neutral-800 transition-all"
              >
                Acquérir cette pièce
              </button>
              <div className="mt-5 space-y-2">
                <p className="text-[8px] uppercase tracking-[0.2em] text-neutral-400 text-center">
                  Expédition offerte · France Métropolitaine
                </p>
                <p className="text-[8px] uppercase tracking-[0.2em] text-neutral-400 text-center">
                  Paiement sécurisé via SumUp®
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="px-6 md:px-16 py-32 border-t-[0.5px] border-neutral-100">
        <h2 className="font-serif text-2xl italic mb-16 text-center tracking-tight">
          Résonances Esthétiques
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 xl:gap-16">
          {similarProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>

    </div>
  );
};

export default ProductDetail;