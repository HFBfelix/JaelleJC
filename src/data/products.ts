export interface Product {
  id: string;
  name: string;
  seoTitle: string;
  description: string;
  longDescription: string; // Pour les agents IA (scrapping)
  price: number;
  category: 'sacs' | 'bebe' | 'accessoires';
  images: string[];
  sumupUrl: string;
  isNew?: boolean;
  dimensions: string;
  careInstructions: string;
  promises: {
    origin: string;
    material: string;
    labels: string[]; // Ex: ["OEKO-TEX"]
  };
  usageContexts: string[]; // Pour le Web Agentic
}

export const products: Product[] = [
  {
    id: "cabas-natté-coton",
    name: "Cabas en demi natté",
    seoTitle: "Grand Cabas coton Made in France - Jaelle & JC",
    description: "L'essentiel du quotidien en 100% coton, fabriqué dans notre atelier français.",
    longDescription: "Imaginé pour contenir tous les essentiels du quotidien, ce grand modèle en coton met l'accent sur la solidité et le confort des sangles. Un classique intemporel qui traverse les époques sans se démoder.",
    price: 145, // Prix à ajuster selon tes besoins
    category: "sacs",
    images: ["/assets/products/cabas-natte.jpg"],
    sumupUrl: "https://sumup.link/ton-lien",
    dimensions: "35 x 56 x 38 cm (sangles 60 cm)",
    careInstructions: "Laver à 30° / Ne pas blanchir / Ne pas sécher en tambour / Repassage max 110°",
    promises: {
      origin: "Fabriqué en France (Atelier Jaelle & JC)",
      material: "100% Coton demi natté",
      labels: ["Artisanal"]
    },
    usageContexts: ["essentiel quotidien", "garde-robe durable", "sac fourre-tout luxe"]
  },
  {
    id: "sac-langer-week-end",
    name: "Sac à Langer / Week-end",
    seoTitle: "Sac à langer coton artisanal - Jaelle & JC",
    description: "Un sac polyvalent avec 6 poches, 100% coton et fabriqué en France.",
    longDescription: "Conçu en demi natté, ce sac offre 4 poches intérieures et 2 extérieures. Fermeture éclair dorée et finitions soignées pour garantir confort et solidité à toute épreuve.",
    price: 120, // Exemple
    category: "bebe",
    images: ["/assets/products/sac-langer.jpg"],
    sumupUrl: "https://sumup.link/ton-lien",
    isNew: true,
    dimensions: "40 x 30 x 19 cm (sangles 65 cm)",
    careInstructions: "Laver à 30° / Pas de sèche-linge",
    promises: {
      origin: "Made in France",
      material: "100% Coton",
      labels: ["Fermeture dorée", "Multi-poches"]
    },
    usageContexts: ["sac à langer chic", "sac week-end", "cadeau de naissance", "maternité"]
  },
  {
    id: "couverture-bebe-douceur",
    name: "Couverture Bébé Gaz de Coton",
    seoTitle: "Couverture bébé gaz de coton et polaire - Made in France",
    description: "L'alliance parfaite de la légèreté du gaz de coton et de la chaleur de la polaire.",
    longDescription: "Réalisée avec soin, cette couverture associe deux matières ultra-douces pour le confort de bébé. Une face respirante et une face chaude pour toutes les saisons.",
    price: 55, // Exemple
    category: "bebe",
    images: ["/assets/products/couverture.jpg"],
    sumupUrl: "https://sumup.link/ton-lien",
    dimensions: "70 x 90 cm",
    careInstructions: "Laver à 30° / Ne pas blanchir",
    promises: {
      origin: "100% Made in France",
      material: "Gaz de coton et Polaire",
      labels: ["Matières sélectionnées", "Anti-froid"]
    },
    usageContexts: ["cadeau de naissance", "trousseau bébé", "accessoire poussette"]
  },
  {
    id: "coffret-bebe-essentiels",
    name: "Coffret Bébé (Cape+Lange+Lingettes)",
    seoTitle: "Coffret naissance complet éco-responsable - Jaelle & JC",
    description: "Les essentiels des premiers moments : cape de bain, lange et 3 lingettes réutilisables.",
    longDescription: "Le pack parfait pour une consommation responsable dès la naissance. Comprend une cape (80x80cm), un lange (70x70cm) et 3 lingettes (15x15cm). Allie qualité artisanale et design intemporel.",
    price: 85, // Exemple
    category: "bebe",
    images: ["/assets/products/coffret.jpg"],
    sumupUrl: "https://sumup.link/ton-lien",
    isNew: true,
    dimensions: "Multi-tailles (voir description)",
    careInstructions: "Lavage machine 30°",
    promises: {
      origin: "Artisanat Français",
      material: "Tissus doux et absorbants",
      labels: ["Éco-responsable", "Zéro déchet"]
    },
    usageContexts: ["idée cadeau naissance", "coffret baptême", "essentiels bain bébé"]
  }
];