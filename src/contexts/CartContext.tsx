import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  quantity: number;
  stock: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, newQuantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const getCartKey = () => (user ? `cart_${user.uid}` : null);

  // CHARGER le panier
  useEffect(() => {
    const key = getCartKey();

    if (key) {
      // Utilisateur connecté : charger depuis localStorage
      const savedCart = localStorage.getItem(key);
      if (savedCart) {
        try {
          const parsed = JSON.parse(savedCart);
          setCart(Array.isArray(parsed) ? parsed : []);
          // Nettoyer le backup de session une fois restauré
          sessionStorage.removeItem('cart_backup');
          return;
        } catch (e) {
          setCart([]);
        }
      }

      // Pas de panier en localStorage → essayer le backup sessionStorage
      // (cas du retour depuis Stripe avant que Firebase ait rechargé le profil)
      const sessionBackup = sessionStorage.getItem('cart_backup');
      if (sessionBackup) {
        try {
          const parsed = JSON.parse(sessionBackup);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCart(parsed);
            // Immédiatement persister dans localStorage pour la clé user
            localStorage.setItem(key, sessionBackup);
            sessionStorage.removeItem('cart_backup');
            return;
          }
        } catch (e) {
          // silencieux
        }
      }

      setCart([]);
    } else {
      // Non connecté : pas de panier, mais on conserve le backup session
      // (Firebase peut encore être en train de charger l'auth au retour de Stripe)
      setCart([]);
    }
  }, [user]);

  // SAUVEGARDER le panier (uniquement si connecté)
  useEffect(() => {
    const key = getCartKey();
    if (key && cart.length > 0) {
      localStorage.setItem(key, JSON.stringify(cart));
    }
  }, [cart, user]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, item.stock || 10) }
            : item
        );
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
        stock: product.stock,
        quantity: 1,
        image: product.images?.[0] || ''
      }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    setCart(prev => prev.map(item =>
      item.id === productId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  // VIDER le panier — uniquement après confirmation Stripe
  const clearCart = () => {
    setCart([]);
    const key = getCartKey();
    if (key) localStorage.removeItem(key);
    sessionStorage.removeItem('cart_backup');
    sessionStorage.removeItem('cart_total_backup');
  };

  const total = cart.reduce((acc, item) => acc + (Number(item.price) * item.quantity || 0), 0);
  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cart, addToCart, removeFromCart, updateQuantity,
      clearCart, isCartOpen, setIsCartOpen, total, itemCount
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