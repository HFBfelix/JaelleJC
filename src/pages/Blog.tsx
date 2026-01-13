import React from 'react';
import { useNavigate } from 'react-router-dom';

const Blog = () => {
  const navigate = useNavigate();

  const articles = [
    {
      id: 1,
      title: "Pour l'amour du Vichy !",
      excerpt: "Le tissu Vichy, également connu sous le nom de tissu à carreaux Vichy, est un type de tissu caractérisé par un motif de carreaux.",
      date: "27 JUIN 2023",
      category: "MATIERE",
      image: "/assets/notre-promesse-engagement.jpg" // Assurez-vous que le fichier existe
    },
    {
      id: 2,
      title: "A la découverte d'un tissu : le jersey",
      excerpt: "À l'origine, le tissu jersey était fabriqué à partir de laine de mouton, avec une technique de tricotage spécifique appelée...",
      date: "30 JUIN 2023",
      category: "MATIETE",
      image: "/assets/products/sac-langer.jpg"
    },
    {
      id: 3,
      title: "Jaelle & JC : Une Histoire d'Amour et de Transformation",
      excerpt: "Au cœur de Jaelle & JC se trouve une histoire profonde. Jaelle la co-créatrice, a trouvé une inspiration inattendue...",
      date: "24 juillet 2024",
      category: "MARQUE",
      image: "/assets/manifesto-hero.jpg"
    },
    {
        id: 4,
        title: "Des essentiels bébés intemporels et made in France : la nouvelle gamme de Jaelle & JC",
        excerpt: "Après dix mois de pause, marqués par un grand bouleversement personnel, c’est avec beaucoup de joie que nous relançons...",
        date: "5 novembre 2024",
        category: "MARQUE",
        image: "/assets/manifesto-hero.jpg"
      }
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      {/* HEADER DE LA PAGE */}
      <div className="text-center mb-20">
        <h1 className="font-serif text-5xl italic mb-4">Le Journal</h1>
        <p className="text-sans text-[10px] uppercase tracking-[0.4em] text-neutral-400">Les chroniques de Jaelle & JC</p>
      </div>

      {/* GRILLE D'ARTICLES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {articles.map((article) => (
          <article 
            key={article.id} 
            className="group cursor-pointer"
            onClick={() => navigate(`/blog/${article.id}`)}
          >
            <div className="aspect-[3/4] overflow-hidden bg-neutral-100 mb-6">
              <img 
                src={article.image} 
                alt={article.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1539109132382-381bb3f1c2b3?auto=format&fit=crop&q=80";
                }}
              />
            </div>
            
            <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-400 mb-3 block">
              {article.category} — {article.date}
            </span>
            
            <h2 className="font-serif text-2xl italic mb-4 group-hover:text-neutral-600 transition-colors">
              {article.title}
            </h2>
            
            <p className="text-sm text-neutral-500 leading-relaxed mb-6 line-clamp-3 italic">
              {article.excerpt}
            </p>
            
            <button className="text-[10px] uppercase tracking-widest border-b border-black pb-1 hover:opacity-50 transition-opacity">
              Lire l'article
            </button>
          </article>
        ))}
      </div>

      {/* SECTION NEWSLETTER (Protégée contre les robots) */}
      <div className="mt-32 py-20 border-t border-neutral-100 text-center">
        <h3 className="font-serif text-2xl italic mb-6">S'inscrire aux Carnets Privés</h3>
        <div className="max-w-md mx-auto flex gap-4">
          <input 
            type="email" 
            placeholder="Votre adresse e-mail" 
            className="flex-grow border-b border-neutral-200 py-2 outline-none focus:border-black text-sm italic"
          />
          <button className="text-[10px] uppercase tracking-widest bg-black text-white px-8 py-3 hover:bg-neutral-800 transition-colors">
            Rejoindre
          </button>
        </div>
        <p className="text-[9px] text-neutral-400 mt-6 uppercase tracking-widest">Aucun spam. Désinscription en un clic.</p>
      </div>
    </div>
  );
};

export default Blog;