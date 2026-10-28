import ProductCard from './ProductCard';
import type { ProductCardView } from '@/server/catalog/types';

// Rendu repris de legacy/src/components/products/ProductGrid.tsx ; les produits arrivent déjà lus par le serveur.
// Retiré : le bloc invisible « coton Oeko-Tex » (label non prouvé, EDITORIAL.md §1).
const ProductGrid = ({ products }: { products: ProductCardView[] }) => (
  <section className="w-full py-10 px-4 md:px-12 bg-white">
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-x-8 md:gap-y-16">
      {products.map((product, i) => (
        <div key={product.id} className="animate-fade-in-up">
          <ProductCard product={product} priority={i < 3} />
        </div>
      ))}
    </div>

    <div className="mt-32 text-center">
      <div className="w-12 h-[0.5px] bg-neutral-300 mx-auto mb-8"></div>
      <p className="text-sans text-[11px] uppercase tracking-[0.12em] text-neutral-400 max-w-sm mx-auto leading-relaxed">
        Chaque création est une invitation à ralentir et à privilégier la qualité sur la quantité.
      </p>
    </div>
  </section>
);

export default ProductGrid;
