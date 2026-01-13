import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const BlogPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // En mode statique, on retrouve les données de l'article via l'ID
  // À l'avenir, ces données pourraient venir de Firebase
  const articles = [
    {
      id: 1,
      title: "Pour l'amour du Vichy !",
      date: "27 JUIN 2023",
      category: "MATIERE",
      image: "/assets/notre-promesse-engagement.jpg",
      content: `
        Le tissu Vichy, également connu sous le nom de tissu à carreaux Vichy, est un type de tissu caractérisé par un motif de carreaux. Les carreaux sont généralement de taille égale et sont souvent associés aux couleurs rouge et blanche, bien que d'autres combinaisons de couleurs puissent également être utilisées.
        
        Ce motif de carreaux est souvent utilisé dans la confection de vêtements et d'articles de maison tels que les nappes, les rideaux, les coussins et les torchons. Il est populaire pour son apparence fraîche, ludique et rétro. Le tissu Vichy est souvent associé à un style champêtre, vintage ou printanier. Ce tissu accompagne les bons moments gastronomiques dans l'herbe.
        
        Le tissu Vichy est fabriqué en utilisant une technique de tissage spécifique où les fils de chaîne et les fils de trame se croisent pour créer les motifs de carreaux. Il peut être réalisé dans différentes qualités de tissu, des plus légères et fluides aux plus épaisses et rigides.
        
        Ce motif est nommé d'après la ville de Vichy. Cette ville est connue pour son passé lors de la collaboration, mais hors-mi cette période peu glorieuse de l'histoire, Vichy a énormément d'atouts et on lui doit en grande partie la renommée de ce tissu. La ville de Vichy est reconnue entre autres pour ces nappes à carreaux rouges et blancs souvent utilisées lors des pique-niques et des repas en plein air dans cette région de la France. Le tissu Vichy est toujours populaire de nos jours et est largement utilisé dans l'industrie de la mode et de la décoration.
        
        Dans l'industrie de la mode, voici quelques exemples marquants, que vous connaissez tous.
        - Robes et jupes : les robes et les jupes en tissu Vichy sont très populaires, surtout pendant les saisons estivales. Elles peuvent être de différentes longueurs, des robes longues et fluides aux jupes courtes et évasées. Les motifs à carreaux apportent une touche ludique et féminine à ces vêtements.
        - Chemises et chemisiers : les chemises et les chemisiers en tissu Vichy sont également très courants. Ils peuvent être portés de manière décontractée avec un jean ou plus habillée avec une jupe ou un pantalon. Ces vêtements sont souvent associés à un style rétro.
        - Accessoires : le tissu Vichy est également utilisé pour créer des accessoires tels que des foulards, des bandeaux pour les cheveux, des sacs à main et des chaussures. Ces accessoires peuvent ajouter une touche de couleur et de gaieté à une tenue.
        - Maillots de bain : le tissu Vichy est souvent utilisé pour confectionner des maillots de bain rétro ou vintage. Les bikinis et les maillots une pièce en tissu Vichy sont très appréciés pour leur allure rétro et leurs motifs ludiques.

Ce tissu peut être décliné dans une variété de couleurs et de combinaisons, ce qui offre de nombreuses possibilités de créativité dans la mode.

Chez Jaelle & JC, nous sommes amoureux des basiques et des intemporels, c'est notre credo. Nous vous invitons à découvrir nos grands cabas en tissu Vichy, 100% fabriqués en France. Ils sauront vous ravir par leur robustesse et des finitions de qualité.

      `
    },
    {
        id: 2,
        title: "A la découverte d'un tissu : le jersey",
        date: "30 JUIN 2023",
        category: "MATIERE",
        image: "/assets/notre-promesse-engagement.jpg",
        content: `
          C'est quoi le jersey :
Rappelons en préambule cette définition ; le tissu est un matériau fabriqué à partir de fibres entrelacées qui est utilisé pour créer une grande variété de produits textiles.
Le jersey est un type de tissu tricoté qui est souple, extensible et confortable à porter. Il est couramment utilisé dans l'industrie textile pour fabriquer des vêtements, des sous-vêtements, des t-shirts, des robes, des jupes et d'autres articles vestimentaires.

Il est important de retenir ici "type de tissu tricoté". Donc le jersey n'est pas un tissu; c'est un abus de langage. Le jersey plus précisément, c'est la façon dont le tissu est tricoté. C'est cette phase de tricotage spécifique qui lui confère les attributs de souplesse et d'extensibilité naturelle. 
On peut avoir un mélange de matières pour le jersey. Chez Jaelle & JC par exemple, pour nos t-shirts, nous utilisons un tissu avec 95% de coton et 5% d'élasthanne. Il existe du jersey avec différents types de fibre (coton, lin, polyester etc...)

Voici quelques caractéristiques et particularités du jersey :
- Composition : le jersey peut être fabriqué à partir de différentes fibres, notamment le coton, le polyester, la viscose, le modal, le bambou et le mélange de fibres. Chaque type de fibre peut conférer des propriétés différentes au tissu, comme la respirabilité, la douceur, l'élasticité, etc.
- Tricotage : le jersey est un tissu tricoté, ce qui signifie que les fils sont entrelacés pour former des boucles. Cela lui confère son extensibilité et sa capacité à revenir à sa forme d'origine après avoir été étiré.
- Texture : le jersey a une texture douce et lisse au toucher, ce qui le rend agréable à porter sur la peau. Il est généralement léger à moyen en poids, bien qu'il puisse également exister dans des versions plus lourdes pour des utilisations spécifiques.
- Élasticité : l'une des caractéristiques principales du jersey est sa grande élasticité dans les deux sens (horizontalement et verticalement). Cela lui permet de s'adapter confortablement au corps et de favoriser la liberté de mouvement.
- Drapé : le jersey a un bon drapé, ce qui signifie qu'il tombe naturellement et épouse les formes du corps. Cela le rend polyvalent pour la création de vêtements ajustés ou fluides.
- Entretien : le jersey est généralement facile à entretenir. La plupart des tissus en jersey peuvent être lavés en machine et nécessitent peu ou pas de repassage.
- En raison de ses propriétés confortables et de son adaptabilité, le jersey est très populaire dans la confection de vêtements décontractés. 

Un peu d'histoire...
L'histoire du tissu jersey remonte au 19e siècle. Le terme "jersey" est dérivé du nom de l'île de Jersey, l'une des îles Anglo-Normandes situées au large des côtes de la France et du Royaume-Uni. C'est sur cette île que le tissu a été initialement produit.

À l'origine, le tissu jersey était fabriqué à partir de laine de mouton, avec une technique de tricotage spécifique appelée "jersey stitch" ou "maille jersey" qui permettait d'obtenir un tissu extensible et souple. La technique du tricotage jersey consiste à interconnecter des boucles de fils de manière à former des rangées de mailles envers d'un côté et des rangées de mailles endroit de l'autre côté du tissu.

Au début du 20e siècle, la production de tissu jersey s'est étendue au-delà de l'île de Jersey et s'est répandue dans d'autres régions, notamment en France et en Amérique. Des améliorations ont été apportées à la technique de fabrication, et d'autres fibres ont été introduites, notamment le coton et les fibres synthétiques, ce qui a donné naissance à différents types de jersey.

Depuis le 19eme siècle, la popularité du tissu jersey a grandi. Il reste apprécié pour sa douceur, son extensibilité et sa capacité à épouser les formes du corps.
        `
      },
      {
        id: 3,
        title: "Jaelle & JC : Une Histoire d'Amour et de Transformation",
        date: "24 juillet 2024",
        category: "MARQUE",
        image: "/assets/notre-promesse-engagement.jpg",
        content: `
          Au cœur de Jaelle & JC se trouve une histoire profonde. Jaelle la co-créatrice, a trouvé une inspiration inattendue dans une rencontre qui a redéfini sa vision de la vie et déterminé le nom de la marque.

JC, pour Jésus-Christ, n'est pas simplement une initiale dans le nom de la marque, mais plutôt le symbole d'une transformation personnelle. Jaelle, après une rencontre profonde et personnelle avec Jésus-Christ, a vu sa vie évoluer de manière extraordinaire. Ce n'est pas simplement une histoire religieuse, mais une histoire d'amour, de valeur personnelle et de changement profond.

Cette transformation personnelle a façonné la philosophie de Jaelle & JC, mais il est crucial de comprendre que la marque n'est en aucun cas religieuse. Au contraire, elle s'inspire de l'idée puissante qu'un changement positif peut survenir lorsque l'on se laisse guider par un amour profond et une inspiration personnelle.

L'initiale JC, bien qu'elle puisse évoquer Jésus-Christ, incarne ici l'idée de laisser l'amour et l'inspiration guider nos vies. C'est un rappel que, tout comme Jaelle a trouvé une nouvelle perspective grâce à son voyage personnel, chacun de nous peut embrasser le changement et évoluer vers une meilleure version de soi-même.

La promesse de Jaelle & JC d'offrir des vêtements basiques et intemporels s'intègre harmonieusement dans cette histoire. Les vêtements sont conçus pour être un reflet de cette transformation intérieure, en mettant l'accent sur la simplicité, la durabilité et le style intemporel. Ils sont conçus pour accompagner chaque individu dans son propre voyage, offrant une base solide pour une garde-robe durable qui évolue avec eux.

En choisissant Jaelle & JC, vous choisissez plus qu'une simple marque de vêtements. Vous choisissez une histoire d'amour, de transformation et d'acceptation du changement. C'est une histoire qui transcende les barrières, apportant avec elle la promesse de vêtements qui capturent l'essence de la vie en constante évolution, tout en restant fidèles à l'engagement de durabilité et de simplicité qui définit notre vision de la mode.

Bienvenue dans notre histoire, bienvenue chez Jaelle & JC.
        `
      },
      {
        id: 4,
        title: "Des essentiels bébés intemporels et made in France : la nouvelle gamme de Jaelle & JC",
        date: "5 novembre 2024",
        category: "SAVOIR-FAIRE",
        image: "/assets/notre-promesse-engagement.jpg",
        content: `
          Chez Jaelle & JC, nous avons toujours eu à cœur de proposer des créations simples, basiques et intemporelles ; faites main et avec amour, pour ceux qui recherchent des produits qui traversent le temps. Après dix mois de pause, marqués par un grand bouleversement personnel, c’est avec beaucoup de joie que nous relançons notre activité et vous présentons une toute nouvelle gamme dédiée aux bébés.

<strong>Pourquoi une gamme pour bébés ?</strong>
La maternité a apporté un nouveau souffle à Jaelle & JC. En attendant mon premier enfant, j’ai pris conscience de l’importance d’avoir des produits de qualité, sûrs et faits dans le respect des savoir-faire artisanaux. En tant que maman, on veut le meilleur pour nos petits, et c’est ainsi que l’idée d’une collection pour bébés a germé.

Aujourd’hui, nous avons hâte de vous présenter nos nouvelles créations : des capes de bain, des couvertures, et bien d’autres essentiels pour bébé, fabriqués en France avec des matières soigneusement sélectionnées. Chaque pièce est pensée pour être pratique, douce et belle, tout en apportant une touche d’élégance simple et intemporelle au quotidien des familles.

<strong>La qualité made in France au service des tout-petits</strong>
Nous sommes convaincus que chaque détail compte, surtout lorsqu’il s’agit de produits pour les plus jeunes. C’est pourquoi nous avons choisi de travailler avec des matières labellisées et de réaliser chaque produit de manière artisanale. Nos créations sont toutes conçues en France, de la conception à l’étiquetage final, en passant par la couture et l’assemblage.

Cette démarche artisanale permet de garantir une qualité qui nous tient à cœur, et qui, nous l’espérons, vous accompagnera au fil des jours et des saisons. En choisissant un produit Jaelle & JC, vous soutenez une production locale et un savoir-faire français, tout en offrant à votre enfant des produits qui respectent à la fois la peau et l’environnement.

<strong>Des produits simples, pratiques, et intemporels</strong>
Chez Jaelle & JC, nous croyons en la beauté des choses simples et durables. Nos créations sont conçues pour durer, sans fioritures ni tendances éphémères. Le cabas, notre produit phare, incarne cet esprit intemporel que nous voulons voir dans notre nouvelle gamme bébé. Comme le cabas, les accessoires pour bébés sont pensés pour être utilisés et aimés chaque jour, tout en restant élégants et faciles à assortir.

<strong>Vos avis comptent : partagez vos besoins et vos envies !</strong>
Nous serions ravis d’en apprendre davantage sur vos attentes et vos envies pour cette nouvelle collection. Êtes-vous aussi sensibles à l’artisanat et au Made in France ? Quels sont, selon vous, les indispensables à avoir pour un bébé ? Vos retours et vos expériences enrichiront notre démarche, et nous permettront de créer des produits encore plus proches de vos besoins.

Merci à toutes et à tous pour votre soutien et votre confiance dans cette belle aventure. Nous avons hâte de vous partager cette nouvelle collection, et de lire vos impressions dans les commentaires ou sur notre Instagram.
        `
      },
    // Ajoutez ici le contenu complet pour les articles 2 et 3
  ];

  const article = articles.find(a => a.id === Number(id));

  if (!article) return <div className="py-40 text-center font-serif italic">Article en cours d'écriture...</div>;

  return (
    <article className="max-w-3xl mx-auto px-6 py-20">
      {/* BOUTON RETOUR */}
      <button 
        onClick={() => navigate('/blog')}
        className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-neutral-400 hover:text-black mb-12 transition-colors"
      >
        <ArrowLeft size={14} /> Retour au Journal
      </button>

      {/* EN-TÊTE ARTICLE */}
      <header className="mb-16">
        <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 block mb-4">
          {article.category} — {article.date}
        </span>
        <h1 className="font-serif text-4xl md:text-5xl italic leading-tight mb-8">
          {article.title}
        </h1>
        <div className="aspect-video overflow-hidden bg-neutral-50">
          <img 
            src={article.image} 
            alt={article.title} 
            className="w-full h-full object-cover"
          />
        </div>
      </header>

      {/* CORPS DE L'ARTICLE */}
      <div className="prose prose-neutral max-w-none">
      <div 
  className="font-serif text-xl italic leading-relaxed text-neutral-800 mb-8 whitespace-pre-line"
  dangerouslySetInnerHTML={{ __html: article.content }} 
/>
      </div>

      {/* APPEL À L'ACTION (Luxe & SEO) */}
      <div className="mt-20 p-12 bg-neutral-50 text-center border border-neutral-100">
        <h3 className="font-serif text-2xl italic mb-6">Inspiré par cet article ?</h3>
        <p className="text-sm text-neutral-500 mb-8 italic">Découvrez les collections.</p>
        <button 
          onClick={() => navigate('/collection')}
          className="bg-black text-white px-10 py-4 text-[10px] uppercase tracking-[0.3em] hover:bg-neutral-800 transition-all"
        >
          Voir la Collection
        </button>
      </div>
    </article>
  );
};

export default BlogPost;