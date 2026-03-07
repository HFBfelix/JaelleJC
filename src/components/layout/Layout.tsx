/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Menu, Search, User, ShoppingBag, X, ChevronRight } from 'lucide-react';
import { db } from '../../lib/firebase'; 
import { collection, onSnapshot } from 'firebase/firestore'; 
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import CartDrawer from '../cart/CartDrawer';
import LoginModal from '../auth/LoginModal';
import CookieBanner from './CookieBanner';
import Newsletter from './Newsletter';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { itemCount, isCartOpen, setIsCartOpen } = useCart();

  // --- LOGIQUE DYNAMIQUE FIREBASE ---
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categories"), (snap) => {
      const cats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCategories(cats);
    });
    return () => unsub();
  }, []);

  const isCollectionPage = location.pathname === '/collection';
  const isProductPage = location.pathname.startsWith('/product/');
  
  // --- DÉTECTION PAGE NEWSLETTER UNIQUE ---
  const isNewsletterPage = location.pathname === '/newsletter';

  const handleNavigation = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  // --- RÈGLE DE GESTION : DÉCLENCHEUR DE RECHERCHE (CLIC UNIQUE) ---
  const triggerSearch = () => {
    // Le state force la détection immédiate par la page Collection
    navigate('/collection?focus=true', { 
      state: { forceFocus: Date.now() } 
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative">
      
      {/* ═══════════════════════════════════════════════════
          HEADER : Identité & Actions
      ═══════════════════════════════════════════════════ */}
      <header className="fixed top-0 left-0 w-full bg-white z-[100] border-b-[0.5px] border-neutral-100">
        <div className="h-[65px] px-6 md:px-12 flex items-center">
          
          <div className="w-1/3 flex items-center gap-5 md:gap-6">
            <button onClick={() => setIsMenuOpen(true)}
              className="flex items-center gap-2 hover:opacity-50 transition-opacity">
              <Menu size={20} strokeWidth={1} />
              <span className="text-[11px] uppercase tracking-[0.2em] hidden md:block">Menu</span>
            </button>
            
            {/* BOUTON RECHERCHE : Visible Mobile & Ordi avec Clic Unique */}
            <button 
              onClick={triggerSearch}
              className="flex items-center gap-3 hover:opacity-50 group transition-opacity py-2"
            >
              <Search size={18} strokeWidth={1} />
              <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-400 group-hover:text-black hidden md:block">
                Rechercher
              </span>
            </button>
          </div>

          <div className="w-1/3 flex justify-center items-center">
            <Link to="/" className="hover:opacity-70 transition-opacity">
              <img src="/assets/Header_site_drapeau.png" alt="Jaelle & JC"
                className="h-[35px] md:h-[55px] w-auto object-contain" />
            </Link>
          </div>

          <div className="w-1/3 flex items-center justify-end gap-6">
            <button
              onClick={() => user ? navigate('/profile') : setIsLoginOpen(true)}
              className="hover:opacity-50 transition-opacity relative"
            >
              <User size={20} strokeWidth={1} />
              {user && <span className="absolute -top-1 -right-1 w-2 h-2 bg-black rounded-full" />}
            </button>
            
            <button onClick={() => setIsCartOpen(true)}
              className="hover:opacity-50 transition-opacity relative">
              <ShoppingBag size={20} strokeWidth={1} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 text-[8px] bg-black text-white w-3 h-3
                  rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* ═══════════════════════════════════════════════════
          NAV SECONDAIRE DYNAMIQUE (Univers Firebase)
      ═══════════════════════════════════════════════════ */}
      {!isProductPage && (
        <nav className="fixed top-[65px] left-0 w-full h-[45px] bg-white/90 backdrop-blur-md z-[40]
          border-b-[0.5px] border-neutral-100 flex items-center justify-center gap-10 md:gap-12 px-6">
          {categories.map((cat) => (
            <Link 
              key={cat.id} 
              to={`/collection?category=${cat.id}`} 
              className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 hover:text-black transition-colors"
            >
              {cat.id}
            </Link>
          ))}
        </nav>
      )}

      {/* ═══════════════════════════════════════════════════
          MENU OVERLAY COMPLET
      ═══════════════════════════════════════════════════ */}
      <div className={`fixed inset-0 bg-white z-[300] transition-transform duration-700 ease-in-out
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        <div className="h-[65px] flex items-center justify-between px-6 md:px-12 border-b-[0.5px] border-neutral-100">
          <div className="w-1/3" />
          <div className="w-1/3 flex justify-center italic font-serif text-lg">Menu</div>
          <div className="w-1/3 flex justify-end">
            <button onClick={() => setIsMenuOpen(false)}><X size={24} strokeWidth={1} /></button>
          </div>
        </div>
        
        <div className="flex flex-col h-[calc(100vh-65px)] justify-between px-8 md:px-24 py-12 max-w-4xl mx-auto overflow-y-auto">
          <nav className="flex flex-col gap-8 mt-10">
            <button onClick={() => handleNavigation('/')} className="text-left font-serif text-3xl md:text-5xl italic text-black hover:pl-4 transition-all duration-300">
              Accueil
            </button>

            <div className="space-y-4">
              <button onClick={() => handleNavigation('/collection')} className="text-left font-serif text-3xl md:text-5xl italic text-black hover:pl-4 transition-all duration-300">
                Collections
              </button>
              <div className="grid grid-cols-2 gap-y-3 pl-4 md:pl-6 border-l border-neutral-100 ml-1">
                {categories.map((cat) => (
                  <button 
                    key={cat.id} 
                    onClick={() => handleNavigation(`/collection?category=${cat.id}`)}
                    className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-neutral-400 hover:text-black transition-colors"
                  >
                    <span className="w-4 h-[0.5px] bg-neutral-200" /> {cat.id}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => handleNavigation('/notre-promesse')} className="text-left font-serif text-3xl md:text-5xl italic text-black hover:pl-4 transition-all duration-300">
              Promesse
            </button>
            <button onClick={() => handleNavigation('/blog')} className="text-left font-serif text-3xl md:text-5xl italic text-black hover:pl-4 transition-all duration-300">
              Journal
            </button>
            <button onClick={() => handleNavigation('/contact')} className="text-left font-serif text-3xl md:text-5xl italic text-neutral-400 hover:text-black hover:pl-4 transition-all duration-300">
              Contact
            </button>
          </nav>

          <div className="flex flex-col gap-6 items-start border-t border-neutral-100 pt-12 mt-12">
            <a href="https://instagram.com/jaellejc" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-neutral-500 hover:text-black">
              <span className="w-8 h-[0.5px] bg-neutral-300" />Instagram
            </a>
            <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-300">© 2026 — Jaelle & JC Atelier</p>
          </div>
        </div>
      </div>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onOpenLogin={() => { setIsCartOpen(false); setIsLoginOpen(true); }} />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      <main className={`flex-grow bg-white overflow-x-hidden ${isProductPage ? 'pt-[65px]' : 'pt-[110px]'}`}>
        {children || <Outlet />}
      </main>

      {/* RÈGLE DE GESTION : On masque le bloc Newsletter UNIQUEMENT sur la page /newsletter */}
      {!isNewsletterPage && <Newsletter />}

      <footer className="py-24 bg-neutral-50 mt-auto px-12 border-t border-neutral-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex gap-8 order-2 md:order-1">
             <Link to="/contact" className="text-[9px] uppercase tracking-widest text-black font-medium">Contact</Link>
             <Link to="/mentions-legales" className="text-[9px] uppercase tracking-widest text-neutral-400">Mentions</Link>
             <Link to="/CGV" className="text-[9px] uppercase tracking-widest text-neutral-400">CGV</Link>
          </div>
          <div className="text-[10px] uppercase tracking-[0.4em] text-neutral-300 order-1 md:order-2 italic font-serif">
            Jaelle & JC
          </div>
        </div>
      </footer>

      <CookieBanner />
    </div>
  );
};

export default Layout;