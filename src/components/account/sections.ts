// Thèmes du compte (organisation validée par Jaelle, 2026-11-04) : une page par thème, « Mes données » à part.
// Lus par le menu (navigateur) et par l'accueil du compte (serveur).
export const ACCOUNT_SECTIONS = [
  { href: '/compte/commandes', label: 'Mes commandes' },
  { href: '/compte/coordonnees', label: 'Mes coordonnées' },
  { href: '/compte/adresses', label: 'Mes adresses' },
  { href: '/compte/securite', label: 'Connexion et sécurité' },
  { href: '/compte/donnees', label: 'Mes données' },
] as const;
