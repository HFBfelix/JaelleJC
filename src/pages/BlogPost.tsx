import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const articles = [
  {
    id: 1,
    title: "Pour l'amour du Vichy !",
    date: "27 JUIN 2023",
    category: "MATIERE",
    image: "/assets/vichy.png",
    content: `Le tissu Vichy, également connu sous le nom de tissu à carreaux Vichy, est un type de tissu caractérisé par un motif de carreaux. Les carreaux sont généralement de taille égale et sont souvent associés aux couleurs rouge et blanche, bien que d'autres combinaisons de couleurs puissent également être utilisées.

Ce motif de carreaux est souvent utilisé dans la confection de vêtements et d'articles de maison tels que les nappes, les rideaux, les coussins et les torchons. Il est populaire pour son apparence fraîche, ludique et rétro. Le tissu Vichy est souvent associé à un style champêtre, vintage ou printanier. Ce tissu accompagne les bons moments gastronomiques dans l'herbe.

Le tissu Vichy est fabriqué en utilisant une technique de tissage spécifique où les fils de chaîne et les fils de trame se croisent pour créer les motifs de carreaux. Il peut être réalisé dans différentes qualités de tissu, des plus légères et fluides aux plus épaisses et rigides.

Ce motif est nommé d'après la ville de Vichy. Cette ville est connue pour son passé lors de la collaboration, mais hors-mi cette période peu glorieuse de l'histoire, Vichy a énormément d'atouts et on lui doit en grande partie la renommée de ce tissu. La ville de Vichy est reconnue entre autres pour ces nappes à carreaux rouges et blancs souvent utilisées lors des pique-niques et des repas en plein air dans cette région de la France. Le tissu Vichy est toujours populaire de nos jours et est largement utilisé dans l'industrie de la mode et de la décoration.

Chez Jaelle & JC, nous sommes amoureux des basiques et des intemporels, c'est notre credo. Nous vous invitons à découvrir nos grands cabas en tissu Vichy, 100% fabriqués en France. Ils sauront vous ravir par leur robustesse et des finitions de qualité.`
  },
  {
    id: 2,
    title: "A la découverte d'un tissu : le jersey",
    date: "30 JUIN 2023",
    category: "MATIERE",
    image: "/assets/products/Jersey2.png",
    content: `C'est quoi le jersey : Rappelons en préambule cette définition ; le tissu est un matériau fabriqué à partir de fibres entrelacées qui est utilisé pour créer une grande variété de produits textiles. Le jersey est un type de tissu tricoté qui est souple, extensible et confortable à porter.

Il est important de retenir ici "type de tissu tricoté". Donc le jersey n'est pas un tissu; c'est un abus de langage. Le jersey plus précisément, c'est la façon dont le tissu est tricoté. C'est cette phase de tricotage spécifique qui lui confère les attributs de souplesse et d'extensibilité naturelle.

L'histoire du tissu jersey remonte au 19e siècle. Le terme "jersey" est dérivé du nom de l'île de Jersey, l'une des îles Anglo-Normandes situées au large des côtes de la France et du Royaume-Uni. C'est sur cette île que le tissu a été initialement produit.

À l'origine, le tissu jersey était fabriqué à partir de laine de mouton, avec une technique de tricotage spécifique appelée "jersey stitch" ou "maille jersey" qui permettait d'obtenir un tissu extensible et souple.

Depuis le 19eme siècle, la popularité du tissu jersey a grandi. Il reste apprécié pour sa douceur, son extensibilité et sa capacité à épouser les formes du corps.`
  },
  {
    id: 3,
    title: "Jaelle & JC : Une Histoire d'Amour et de Transformation",
    date: "24 JUILLET 2024",
    category: "MARQUE",
    image: "/assets/JC fond noir.png",
    content: `Au cœur de Jaelle & JC se trouve une histoire profonde. Jaelle la co-créatrice, a trouvé une inspiration inattendue dans une rencontre qui a redéfini sa vision de la vie et déterminé le nom de la marque.

JC, pour Jésus-Christ, n'est pas simplement une initiale dans le nom de la marque, mais plutôt le symbole d'une transformation personnelle. Jaelle, après une rencontre profonde et personnelle avec Jésus-Christ, a vu sa vie évoluer de manière extraordinaire. Ce n'est pas simplement une histoire religieuse, mais une histoire d'amour, de valeur personnelle et de changement profond.

Cette transformation personnelle a façonné la philosophie de Jaelle & JC, mais il est crucial de comprendre que la marque n'est en aucun cas religieuse. Au contraire, elle s'inspire de l'idée puissante qu'un changement positif peut survenir lorsque l'on se laisse guider par un amour profond et une inspiration personnelle.

En choisissant Jaelle & JC, vous choisissez plus qu'une simple marque de vêtements. Vous choisissez une histoire d'amour, de transformation et d'acceptation du changement.

Bienvenue dans notre histoire, bienvenue chez Jaelle & JC.`
  },
  {
    id: 4,
    title: "Des essentiels bébés intemporels et made in France",
    date: "5 NOVEMBRE 2024",
    category: "SAVOIR-FAIRE",
    image: "/assets/article4.png",
    content: `Chez Jaelle & JC, nous avons toujours eu à cœur de proposer des créations simples, basiques et intemporelles ; faites main et avec amour, pour ceux qui recherchent des produits qui traversent le temps. Après dix mois de pause, marqués par un grand bouleversement personnel, c'est avec beaucoup de joie que nous relançons notre activité et vous présentons une toute nouvelle gamme dédiée aux bébés.

Pourquoi une gamme pour bébés ? La maternité a apporté un nouveau souffle à Jaelle & JC. En attendant mon premier enfant, j'ai pris conscience de l'importance d'avoir des produits de qualité, sûrs et faits dans le respect des savoir-faire artisanaux.

Aujourd'hui, nous avons hâte de vous présenter nos nouvelles créations : des capes de bain, des couvertures, et bien d'autres essentiels pour bébé, fabriqués en France avec des matières soigneusement sélectionnées.

La qualité made in France au service des tout-petits. Nous sommes convaincus que chaque détail compte, surtout lorsqu'il s'agit de produits pour les plus jeunes.

Merci à toutes et à tous pour votre soutien et votre confiance dans cette belle aventure.`
  }
];

const BlogPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const article = articles.find(a => a.id === Number(id));

  if (!article) return (
    <div className="py-40 text-center font-serif italic text-neutral-400">
      Article en cours d'écriture…
    </div>
  );

  const otherArticles = articles.filter(a => a.id !== article.id).slice(0, 2);

  return (
    <article className="min-h-screen bg-white">

      {/* IMAGE HERO PLEINE LARGEUR */}
      <div className="w-full aspect-[16/7] md:aspect-[16/5] overflow-hidden bg-neutral-100 relative">
        <img
          src={article.image}
          alt={article.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1539109132382-381bb3f1c2b3?auto=format&fit=crop&q=80";
          }}
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute bottom-0 left-0 right-0 px-6 md:px-16 pb-10 md:pb-16">
          <span className="text-[9px] uppercase tracking-[0.4em] text-white/60 block mb-3">
            {article.category} — {article.date}
          </span>
          <h1 className="font-serif text-3xl md:text-5xl italic text-white leading-tight max-w-3xl">
            {article.title}
          </h1>
        </div>
      </div>

      {/* CORPS */}
      <div className="max-w-2xl mx-auto px-6 py-16 md:py-24">

        {/* Retour */}
        <button
          onClick={() => navigate('/blog')}
          className="flex items-center gap-3 mb-16 hover:opacity-50 transition-opacity group"
        >
          <div className="h-[0.5px] w-6 bg-black group-hover:w-10 transition-all" />
          <span className="text-[9px] uppercase tracking-[0.3em]">Le Journal</span>
        </button>

        {/* Contenu */}
        <div className="space-y-6">
          {article.content.split('\n\n').filter(p => p.trim()).map((paragraph, i) => (
            <p key={i} className="font-serif text-[16px] md:text-[17px] leading-[1.9] text-neutral-800 italic">
              {paragraph.trim()}
            </p>
          ))}
        </div>

        {/* Signature */}
        <div className="flex items-center gap-4 mt-16 pt-10 border-t-[0.5px] border-neutral-100">
          <div className="h-[0.5px] w-8 bg-neutral-300" />
          <span className="text-[9px] uppercase tracking-[0.3em] text-neutral-400">Jaelle & JC</span>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 md:px-16 py-16 bg-neutral-50 text-center border-t-[0.5px] border-neutral-100">
        <h3 className="font-serif text-2xl italic mb-8">Inspiré par cet article ?</h3>
        <button
          onClick={() => navigate('/collection')}
          className="bg-black text-white px-12 py-4 text-[9px] uppercase tracking-[0.4em] hover:bg-neutral-800 transition-all"
        >
          Découvrir la Collection
        </button>
      </div>

      {/* ARTICLES SUIVANTS */}
      {otherArticles.length > 0 && (
        <div className="px-6 md:px-16 py-20 border-t-[0.5px] border-neutral-100">
          <span className="text-[9px] uppercase tracking-[0.5em] text-neutral-400 block mb-12">Continuer la lecture</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {otherArticles.map(a => (
              <div
                key={a.id}
                className="group cursor-pointer"
                onClick={() => { navigate(`/blog/${a.id}`); window.scrollTo(0, 0); }}
              >
                <div className="aspect-[4/3] overflow-hidden bg-neutral-50 mb-5">
                  <img
                    src={a.image}
                    alt={a.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1539109132382-381bb3f1c2b3?auto=format&fit=crop&q=80";
                    }}
                  />
                </div>
                <span className="text-[9px] uppercase tracking-[0.3em] text-neutral-400 block mb-2">{a.category} — {a.date}</span>
                <h3 className="font-serif text-xl italic group-hover:text-neutral-500 transition-colors">{a.title}</h3>
              </div>
            ))}
          </div>
        </div>
      )}

    </article>
  );
};

export default BlogPost;