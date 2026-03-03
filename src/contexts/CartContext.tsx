import React, { createContext, useContext, useState, useEffect } from 'react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  quantity: number;
  stock: number; // IA : Ajouté pour la gestion des limites dans le drawer
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, newQuantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean; // IA : Nouvel état
  setIsCartOpen: (isOpen: boolean) => void; // IA : Nouvelle fonction
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('jaelle_jc_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  // IA : État pour contrôler l'ouverture du panier latéral
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('jaelle_jc_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        // IA : Si l'article existe, on s'assure de ne pas dépasser le stock
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: Math.min(item.quantity + 1, item.stock || 1) } 
            : item
        );
      }
      return [...prev, { ...product, quantity: 1, image: product.images?.[0] }];
    });
    
    // IA : OUVERTURE AUTOMATIQUE déclenchée ici
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    setCart(prevCart => 
      prevCart.map(item => 
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };
  
  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const clearCart = () => setCart([]);

  // IA : Calcul dynamique prenant en compte les quantités
  const total = cart.reduce((acc, item) => acc + (Number(item.price) * item.quantity || 0), 0);
  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      isCartOpen, 
      setIsCartOpen, 
      total, 
      itemCount 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart doit être utilisé dans un CartProvider");
  return context;
};