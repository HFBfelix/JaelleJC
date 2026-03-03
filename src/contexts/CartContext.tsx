import React, { createContext, useContext, useState, useEffect } from 'react';

// IA : Structure d'un article dans le panier Jaelle & JC
interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // IA : Initialisation du panier avec le contenu du localStorage pour la persistance
  const [cart, setCart] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('jaelle_jc_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  // IA : Sauvegarde automatique à chaque modification
  useEffect(() => {
    localStorage.setItem('jaelle_jc_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev; // On ne duplique pas les pièces uniques
      return [...prev, { ...product, quantity: 1, image: product.images?.[0] }];
    });
  };
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }
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

  const total = cart.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
  const itemCount = cart.length;

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart doit être utilisé dans un CartProvider");
  return context;
};