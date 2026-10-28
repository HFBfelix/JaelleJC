// Articles du journal, repris mot pour mot de legacy/src/pages/Blog.tsx et BlogPost.tsx (étape 2).
// Ils étaient écrits dans le code, pas dans la base ; ils passeront dans `articles_blog` avec l'espace créatrice (étape 7).
// Correction : l'image de l'article « jersey » pointait vers un fichier absent dans la liste du journal.
export type Article = {
  legacyId: number; // ancienne adresse /blog/<numéro>, redirigée en 301
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  isoDate: string;
  category: string;
  image: string;
  content: string;
};

export const ARTICLES: Article[] = [
  {
    "legacyId": 1,
    "slug": "pour-l-amour-du-vichy",
    "title": "Pour l'amour du Vichy !",
    "excerpt": "Le tissu Vichy, également connu sous le nom de tissu à carreaux Vichy, est un type de tissu caractérisé par un motif de carreaux.",
    "date": "27 JUIN 2023",
    "isoDate": "2023-06-27",
    "category": "MATIERE",
    "image": "/assets/vichy.png",
    "content": "Le tissu Vichy, également connu sous le nom de tissu à carreaux Vichy, est un type de tissu caractérisé par un motif de carreaux. Les carreaux sont généralement de taille égale et sont souvent associés aux couleurs rouge et blanche, bien que d'autres combinaisons de couleurs puissent également être utilisées.\n\nCe motif de carreaux est souvent utilisé dans la confection de vêtements et d'articles de maison tels que les nappes, les rideaux, les coussins et les torchons. Il est populaire pour son apparence fraîche, ludique et rétro. Le tissu Vichy est souvent associé à un style champêtre, vintage ou printanier. Ce tissu accompagne les bons moments gastronomiques dans l'herbe.\n\nLe tissu Vichy est fabriqué en utilisant une technique de tissage spécifique où les fils de chaîne et les fils de trame se croisent pour créer les motifs de carreaux. Il peut être réalisé dans différentes qualités de tissu, des plus légères et fluides aux plus épaisses et rigides.\n\nCe motif est nommé d'après la ville de Vichy. Cette ville est connue pour son passé lors de la collaboration, mais hors-mi cette période peu glorieuse de l'histoire, Vichy a énormément d'atouts et on lui doit en grande partie la renommée de ce tissu. La ville de Vichy est reconnue entre autres pour ces nappes à carreaux rouges et blancs souvent utilisées lors des pique-niques et des repas en plein air dans cette région de la France. Le tissu Vichy est toujours populaire de nos jours et est largement utilisé dans l'industrie de la mode et de la décoration.\n\nChez Jaelle & JC, nous sommes amoureux des basiques et des intemporels, c'est notre credo. Nous vous invitons à découvrir nos grands cabas en tissu Vichy, 100% fabriqués en France. Ils sauront vous ravir par leur robustesse et des finitions de qualité."
  },
  {
    "legacyId": 2,
    "slug": "a-la-decouverte-d-un-tissu-le-jersey",
    "title": "A la découverte d'un tissu : le jersey",
    "excerpt": "À l'origine, le tissu jersey était fabriqué à partir de laine de mouton, avec une technique de tricotage spécifique appelée...",
    "date": "30 JUIN 2023",
    "isoDate": "2023-06-30",
    "category": "MATIERE",
    "image": "/assets/Jersey2.png",
    "content": "C'est quoi le jersey : Rappelons en préambule cette définition ; le tissu est un matériau fabriqué à partir de fibres entrelacées qui est utilisé pour créer une grande variété de produits textiles. Le jersey est un type de tissu tricoté qui est souple, extensible et confortable à porter.\n\nIl est important de retenir ici \"type de tissu tricoté\". Donc le jersey n'est pas un tissu; c'est un abus de langage. Le jersey plus précisément, c'est la façon dont le tissu est tricoté. C'est cette phase de tricotage spécifique qui lui confère les attributs de souplesse et d'extensibilité naturelle.\n\nL'histoire du tissu jersey remonte au 19e siècle. Le terme \"jersey\" est dérivé du nom de l'île de Jersey, l'une des îles Anglo-Normandes situées au large des côtes de la France et du Royaume-Uni. C'est sur cette île que le tissu a été initialement produit.\n\nÀ l'origine, le tissu jersey était fabriqué à partir de laine de mouton, avec une technique de tricotage spécifique appelée \"jersey stitch\" ou \"maille jersey\" qui permettait d'obtenir un tissu extensible et souple.\n\nDepuis le 19eme siècle, la popularité du tissu jersey a grandi. Il reste apprécié pour sa douceur, son extensibilité et sa capacité à épouser les formes du corps."
  },
  {
    "legacyId": 3,
    "slug": "jaelle-et-jc-une-histoire-d-amour-et-de-transformation",
    "title": "Jaelle & JC : Une Histoire d'Amour et de Transformation",
    "excerpt": "Au cœur de Jaelle & JC se trouve une histoire profonde. Jaelle la co-créatrice, a trouvé une inspiration inattendue...",
    "date": "24 JUILLET 2024",
    "isoDate": "2024-07-24",
    "category": "MARQUE",
    "image": "/assets/JC fond noir.png",
    "content": "Au cœur de Jaelle & JC se trouve une histoire profonde. Jaelle la co-créatrice, a trouvé une inspiration inattendue dans une rencontre qui a redéfini sa vision de la vie et déterminé le nom de la marque.\n\nJC, pour Jésus-Christ, n'est pas simplement une initiale dans le nom de la marque, mais plutôt le symbole d'une transformation personnelle. Jaelle, après une rencontre profonde et personnelle avec Jésus-Christ, a vu sa vie évoluer de manière extraordinaire. Ce n'est pas simplement une histoire religieuse, mais une histoire d'amour, de valeur personnelle et de changement profond.\n\nCette transformation personnelle a façonné la philosophie de Jaelle & JC, mais il est crucial de comprendre que la marque n'est en aucun cas religieuse. Au contraire, elle s'inspire de l'idée puissante qu'un changement positif peut survenir lorsque l'on se laisse guider par un amour profond et une inspiration personnelle.\n\nEn choisissant Jaelle & JC, vous choisissez plus qu'une simple marque de vêtements. Vous choisissez une histoire d'amour, de transformation et d'acceptation du changement.\n\nBienvenue dans notre histoire, bienvenue chez Jaelle & JC."
  },
  {
    "legacyId": 4,
    "slug": "des-essentiels-bebes-intemporels-et-made-in-france",
    "title": "Des essentiels bébés intemporels et made in France",
    "excerpt": "Après dix mois de pause, marqués par un grand bouleversement personnel, c'est avec beaucoup de joie que nous relançons...",
    "date": "5 NOVEMBRE 2024",
    "isoDate": "2024-11-05",
    "category": "SAVOIR-FAIRE",
    "image": "/assets/article4.png",
    "content": "Chez Jaelle & JC, nous avons toujours eu à cœur de proposer des créations simples, basiques et intemporelles ; faites main et avec amour, pour ceux qui recherchent des produits qui traversent le temps. Après dix mois de pause, marqués par un grand bouleversement personnel, c'est avec beaucoup de joie que nous relançons notre activité et vous présentons une toute nouvelle gamme dédiée aux bébés.\n\nPourquoi une gamme pour bébés ? La maternité a apporté un nouveau souffle à Jaelle & JC. En attendant mon premier enfant, j'ai pris conscience de l'importance d'avoir des produits de qualité, sûrs et faits dans le respect des savoir-faire artisanaux.\n\nAujourd'hui, nous avons hâte de vous présenter nos nouvelles créations : des capes de bain, des couvertures, et bien d'autres essentiels pour bébé, fabriqués en France avec des matières soigneusement sélectionnées.\n\nLa qualité made in France au service des tout-petits. Nous sommes convaincus que chaque détail compte, surtout lorsqu'il s'agit de produits pour les plus jeunes.\n\nMerci à toutes et à tous pour votre soutien et votre confiance dans cette belle aventure."
  }
];

export const getArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug) ?? null;
