/**
 * DÉFINITIONS DES TYPES - JAELLE & JC
 * Garantit la cohérence des données entre le code et Firebase
 */

// Définition d'un Produit de luxe
export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    category: 'sacs' | 'bebe' | 'accessoires';
    images: string[];      // URLs venant de Firebase Storage
    sumupUrl: string;    // Lien direct de paiement SumUp
    isNew?: boolean;       // Optionnel : affiche le badge "Nouveau"
    details?: string[];    // Optionnel : liste de caractéristiques (ex: "Cuir italien")
  }
  
  // Définition pour la Newsletter (Brevo)
  export interface NewsletterSubscriber {
    email: string;
    subscribedAt: Date;
  }
  
  // Définition pour les pages Légales
  export interface LegalContent {
    title: string;
    lastUpdated: string;
    sections: {
      subtitle?: string;
      content: string;
    }[];
  }