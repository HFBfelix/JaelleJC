import React from 'react';
import { useNavigate } from 'react-router-dom';

const articles = [
  {
    id: 1,
    title: "Pour l'amour du Vichy !",
    excerpt: "Le tissu Vichy, également connu sous le nom de tissu à carreaux Vichy, est un type de tissu caractérisé par un motif de carreaux.",
    date: "27 JUIN 2023",
    category: "MATIERE",
    image: "/assets/vichy.png"
  },
  {
    id: 2,
    title: "A la découverte d'un tissu : le jersey",
    excerpt: "À l'origine, le tissu jersey était fabriqué à partir de laine de mouton, avec une technique de tricotage spécifique appelée...",
    date: "30 JUIN 2023",
    category: "MATIERE",
    image: "/assets/products/Jersey2.png"
  },
  {
    id: 3,
    title: "Jaelle & JC : Une Histoire d'Amour et de Transformation",
    excerpt: "Au cœur de Jaelle & JC se trouve une histoire profonde. Jaelle la co-créatrice, a trouvé une inspiration inattendue...",
    date: "24 JUILLET 2024",
    category: "MARQUE",
    image: "/assets/JC fond noir.png"
  },
  {
    id: 4,
    title: "Des essentiels bébés intemporels et made in France",
    excerpt: "Après dix mois de pause, marqués par un grand bouleversement personnel, c'est avec beaucoup de joie que nous relançons...",
    date: "5 NOVEMBRE 2024",
    category: "SAVOIR-FAIRE",
    image: "/assets/article4.png"
  }
];

const Blog = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <section className="px-6 md:px-16 pt-8 pb-16 border-b-[0.5px] border-neutral-100">
        <span className="text-[9px] uppercase tracking-[0.6em] text-neutral-300 block mb-3">Maison</span>
        <h1 className="font-serif text-5xl md:text-7xl italic leading-none mb-2">Le Journal</h1>
        <p className="text-[9px] uppercase tracking-[0.4em] text-neutral-400 mt-4">
          Les chroniques de Jaelle & JC
        </p>
      </section>

      {/* ARTICLE HERO — le plus récent en grand */}
      <section
        className="relative cursor-pointer group overflow-hidden"
        onClick={() => navigate(`/blog/${articles[articles.length - 1].id}`)}
      >
        <div className="aspect-[16/7] md:aspect-[16/6] overflow-hidden bg-neutral-100">
          <img
            src={articles[articles.length - 1].image}
            alt={articles[articles.length - 1].title}
            className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1539109132382-381bb3f1c2b3?auto=format&fit=crop&q=80";
            }}
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-all duration-500" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
          <span className="text-[9px] uppercase tracking-[0.4em] text-white/60 block mb-3">
            {articles[articles.length - 1].category} — {articles[articles.length - 1].date}
          </span>
          <h2 className="font-serif text-2xl md:text-4xl italic text-white leading-tight max-w-2xl">
            {articles[articles.length - 1].title}
          </h2>
          <div className="flex items-center gap-3 mt-6">
            <div className="h-[0.5px] w-6 bg-white/60 group-hover:w-12 transition-all duration-300" />
            <span className="text-[9px] uppercase tracking-[0.3em] text-white/60">Lire l'article</span>
          </div>
        </div>
      </section>

      {/* GRILLE ARTICLES */}
      <section className="px-6 md:px-16 py-20 md:py-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-20">
          {articles.slice(0, articles.length - 1).map((article, idx) => (
            <article
              key={article.id}
              className={`group cursor-pointer ${idx === 1 ? 'md:mt-20' : ''}`}
              onClick={() => navigate(`/blog/${article.id}`)}
            >
              <div className="aspect-[3/4] overflow-hidden bg-neutral-50 mb-6">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1539109132382-381bb3f1c2b3?auto=format&fit=crop&q=80";
                  }}
                />
              </div>
              <span className="text-[9px] uppercase tracking-[0.3em] text-neutral-400 mb-3 block">
                {article.category} — {article.date}
              </span>
              <h2 className="font-serif text-xl md:text-2xl italic mb-4 leading-tight group-hover:text-neutral-500 transition-colors">
                {article.title}
              </h2>
              <p className="text-[12px] text-neutral-400 leading-relaxed line-clamp-3 font-light italic mb-6">
                {article.excerpt}
              </p>
              <div className="flex items-center gap-3 group-hover:gap-5 transition-all">
                <div className="h-[0.5px] w-5 bg-black" />
                <span className="text-[9px] uppercase tracking-widest">Lire</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="px-6 md:px-16 py-20 border-t-[0.5px] border-neutral-100 bg-neutral-50">
        <div className="max-w-xl mx-auto text-center">
          <span className="text-[9px] uppercase tracking-[0.5em] text-neutral-400 block mb-4">Carnets Privés</span>
          <h3 className="font-serif text-3xl italic mb-3">S'inscrire aux Chroniques</h3>
          <p className="text-[11px] text-neutral-400 italic mb-10">Aucun spam. Désinscription en un clic.</p>
          <div className="flex gap-0 border-b border-black">
            <input
              type="email"
              placeholder="Votre adresse e-mail"
              className="flex-grow py-3 outline-none bg-transparent text-sm italic placeholder:text-neutral-300"
            />
            <button className="text-[9px] uppercase tracking-[0.3em] px-6 hover:opacity-50 transition-opacity">
              Rejoindre
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Blog;