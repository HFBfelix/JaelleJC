import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
const GUEST_KEY = 'cart_guest';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  
  // 💡 INIT SYNCHRONE : On regarde tout de suite dans le localStorage avant même le premier render
  const [cart, setCart] = useState<CartItem[]>(() => {
    const guestSaved = localStorage.getItem(GUEST_KEY);
    return guestSaved ? tryParse(guestSaved) : [];
  });
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const isInitialMount = useRef(true);

  const getUserKey = () => (user ? `cart_${user.uid}` : GUEST_KEY);

  // 1. GESTION DU CHARGEMENT / FUSION (Quand l'auth change)
  useEffect(() => {
    // Si l'auth charge encore, on reste sur le panier guest initialisé plus haut
    if (authLoading) return;

    if (user) {
      const guestRaw = localStorage.getItem(GUEST_KEY);
      const userRaw = localStorage.getItem(`cart_${user.uid}`);
      
      const guestItems = guestRaw ? tryParse(guestRaw) : [];
      const userItems = userRaw ? tryParse(userRaw) : [];

      if (guestItems.length > 0) {
        const merged = mergeItems(userItems, guestItems);
        setCart(merged);
        localStorage.setItem(`cart_${user.uid}`, JSON.stringify(merged));
        localStorage.removeItem(GUEST_KEY);
      } else {
        setCart(userItems);
      }
    } else {
      // Utilisateur déconnecté ou session terminée -> Repasser en Guest
      const savedGuest = localStorage.getItem(GUEST_KEY);
      setCart(savedGuest ? tryParse(savedGuest) : []);
    }
    
    isInitialMount.current = false;
  }, [user, authLoading]);

  // 2. SAUVEGARDE AUTOMATIQUE (À chaque modification du panier)
  useEffect(() => {
    if (authLoading) return;
    
    const key = getUserKey();
    if (cart.length > 0) {
      localStorage.setItem(key, JSON.stringify(cart));
    } else if (!isInitialMount.current) {
      // On ne remove que si ce n'est pas le tout premier chargement vide
      localStorage.removeItem(key);
    }
  }, [cart, user, authLoading]);

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
        stock: product.stock || 10,
        quantity: 1,
        image: product.images?.[0] || product.image || '',
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

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem(getUserKey());
    localStorage.removeItem(GUEST_KEY);
    sessionStorage.removeItem('cart_backup');
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

// ─── Helpers ───────────────────────────────────────────────
function tryParse(raw: string): CartItem[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeItems(base: CartItem[], incoming: CartItem[]): CartItem[] {
  const result = [...base];
  for (const item of incoming) {
    const existing = result.find(r => r.id === item.id);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + item.quantity, existing.stock || 10);
    } else {
      result.push(item);
    }
  }
  return result;
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart doit être utilisé dans un CartProvider');
  return context;
};