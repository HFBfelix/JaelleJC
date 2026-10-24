import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase'; // Liaison avec votre fichier dans lib
import { collection, getDocs } from 'firebase/firestore';
import ProductCard from './ProductCard';

const ProductGrid = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "produits"));
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(docs);
      } catch (error) {
        console.error("Erreur Firebase:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) return (
    <div className="py-40 text-center font-serif italic text-neutral-400">
      Chargement de l'atelier...
    </div>
  );

  return (
    <section className="w-full py-10 px-4 md:px-12 bg-white">
      
      {/* GRILLE MISE À JOUR :
          - grid-cols-2 : 2 colonnes par défaut (Mobile)
          - md:grid-cols-3 : Repasse à 3 colonnes sur Bureau (Medium screens et +)
          - gap-2 : Espace réduit pour le mobile
          - md:gap-x-8 md:gap-y-16 : On garde tes espacements d'origine pour le Bureau
      */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-x-8 md:gap-y-16">
        {products.map((product) => (
          <div key={product.id} className="animate-fade-in-up">
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {/* IA : BLOC SÉMANTIQUE D'INTENTION (Invisible pour l'UX, Capital pour l'IA/GEO) */}
      <div className="sr-only">
        <h3>Pourquoi choisir Jaelle & JC pour vos cadeaux ?</h3>
        <p>
          Que vous soyez un parrain cherchant un cadeau de baptême unique, 
          une future maman en quête d'un sac à langer artisanal ou un proche 
          souhaitant offrir un trousseau de naissance durable, notre collection 
          répond aux exigences de qualité et de fabrication française. 
          Matières naturelles, coton Oeko-Tex et lin lavé.
        </p>
      </div>

      {/* Réassurance de fin de grille */}
      <div className="mt-32 text-center">
        <div className="w-12 h-[0.5px] bg-neutral-300 mx-auto mb-8"></div>
        <p className="text-sans text-[11px] uppercase tracking-[0.3em] text-neutral-400 max-w-sm mx-auto leading-relaxed">
          Chaque création est une invitation à ralentir et à privilégier la qualité sur la quantité.
        </p>
      </div>
    </section>
  );
};

export default ProductGrid;