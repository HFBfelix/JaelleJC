import HeroImmersif, { type HeroSlide } from '@/components/home/HeroImmersif';
import HomeSearch from '@/components/home/HomeSearch';
import ProductGrid from '@/components/products/ProductGrid';
import JsonLd from '@/components/seo/JsonLd';
import { listPublishedProducts } from '@/server/catalog/repository';
import { organizationJsonLd } from '@/server/seo/jsonld';

// Accueil : rendu repris de legacy/src/pages/Home.tsx, lu côté serveur (contenu présent dans le HTML initial).
// Textes inchangés à cette étape : ils évoluent à l'étape 8 (EDITORIAL.md §2).
export const dynamic = 'force-dynamic';

const SLIDES: (Omit<HeroSlide, 'href'> & { productId: string })[] = [
  {
    productId: 'giDoycYl8m1OYehLlws8', // cabas bleu
    title: "L'élégance du coton",
    subtitle: 'le cabas imprimé bleu',
    images: ['/assets/cabasbleu3.webp', '/assets/cabas_bleu_2.webp'],
    description: 'Une silhouette intemporelle pour vos journées ensoleillées.',
    lightness: 'high',
  },
  {
    productId: 'MnXZRalzF37is34LXPmx', // coffret blanc pétales
    title: 'Poésie de naissance',
    subtitle: 'le coffret blanc pétales',
    images: ['/assets/IMG_4836.webp', '/assets/IMG_4869.webp'],
    description: 'Un semis de fleurs bleues pour accueillir la vie avec douceur.',
    lightness: 'medium',
  },
  {
    productId: 'u1Y3BBm5r2omFnYsFFhn', // couverture pétales
    title: "Douceur d'atelier",
    subtitle: 'la couverture pétales',
    images: ['/assets/IMG_4826.webp', '/assets/IMG_4831.webp'],
    description: "Le raffinement du coton blanc et l'éclat des pétales azur.",
    lightness: 'high',
  },
];

export default async function HomePage() {
  const products = await listPublishedProducts();
  const slides: HeroSlide[] = SLIDES.map(({ productId, ...slide }) => {
    const product = products.find((p) => p.id === productId);
    return { ...slide, href: product ? `/produits/${product.slug}` : '/collection' };
  });

  return (
    <div className="w-full bg-white font-sans antialiased">
      <JsonLd data={organizationJsonLd()} />

      <HeroImmersif slides={slides} />

      <article className="py-[12vh] px-[6.4vw] md:px-[8.33vw] flex flex-col items-center text-center">
        <div className="max-w-[1200px] animate-in fade-in slide-in-from-bottom-8 duration-1000">

          <h1 className="font-serif text-[clamp(2.5rem,6vw,5rem)] leading-[1.1] mb-[6vh]">
            Dessiner un vestiaire de l&apos;essentiel <br className="hidden md:block"/> pour la femme et l&apos;enfant.
          </h1>

          <div className="w-[1px] h-[10vh] bg-black mx-auto mb-[6vh] opacity-10"></div>

          <div className="max-w-[800px] mx-auto space-y-[4vh]">
            <p className="font-serif text-[clamp(1.2rem,2.5vw,1.8rem)] text-neutral-800 tracking-tight">
              &quot;Bienvenue là où l&apos;artisanat français rencontre une mode pensée pour durer.&quot;
            </p>

            <div className="max-w-[500px] mx-auto">
              <p className="text-[clamp(12px,1.2vw,14px)] text-neutral-500 leading-relaxed tracking-[0.05em] uppercase opacity-70">
                L&apos;excellence du <span className="text-black border-b-[0.5px] border-black/30 pb-1">fait-main</span> pour
                ceux qui cherchent une alternative durable.
              </p>
            </div>
          </div>
        </div>
      </article>

      <section className="py-[8vh] px-[6.4vw] md:px-[8.33vw] bg-neutral-50/40 border-y-[0.5px] border-neutral-100">
        <HomeSearch />
      </section>

      <div id="collection" className="pt-[10vh] pb-0 px-[6.4vw] md:px-[8.33vw]">
        <div className="flex items-center gap-6 md:gap-10 mb-[1vh]">
          <span className="text-[11px] font-bold tracking-[0.12em] text-neutral-300">01</span>
          <h2 className="font-serif text-[clamp(1.5rem,3vw,2.5rem)] text-black whitespace-nowrap">
            L&apos;essentiel
          </h2>
          <div className="h-[0.5px] flex-grow bg-neutral-100"></div>
        </div>

        <div className="relative">
          <ProductGrid products={products} />
        </div>
      </div>

      <footer className="py-[12vh] px-[6.4vw] text-center border-t-[0.5px] border-neutral-100">
        <div className="max-w-[600px] mx-auto space-y-10">
          <p className="font-serif text-[clamp(1.5rem,2.5vw,2rem)] text-neutral-800">
            De belles matières, l&apos;amour de l&apos;artisanat.
          </p>
          <div className="w-12 h-[1px] bg-neutral-200 mx-auto"></div>
          <p className="text-[11px] text-neutral-400 uppercase tracking-[0.12em]">
            Atelier Jaelle & JC — France
          </p>
        </div>
      </footer>
    </div>
  );
}
