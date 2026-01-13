import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, User, ShoppingBag, X } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isCollectionPage = location.pathname === '/collection';

  // Sécurité UX : Fermer le menu si on change de page
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleNavigation = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-x-hidden">
      {/* HEADER FIXE (Z-100) */}
      <header className="fixed top-0 left-0 w-full bg-white z-[100] border-b-[0.5px] border-neutral-100">
        <div className="h-[65px] px-6 md:px-12 flex items-center">
          <div className="w-1/3 flex items-center gap-6">
            <button onClick={() => setIsMenuOpen(true)} className="flex items-center gap-2 hover:opacity-50 transition-opacity">
              <Menu size={20} strokeWidth={1} />
              <span className="text-sans text-[11px] uppercase tracking-[0.2em] hidden md:block">Menu</span>
            </button>
            
            {!isCollectionPage && (
              <button onClick={() => navigate('/collection')} className="hidden md:flex items-center gap-3 hover:opacity-50 group transition-opacity">
                <Search size={18} strokeWidth={1} />
                <span className="text-sans text-[11px] uppercase tracking-[0.2em] text-neutral-400 group-hover:text-black">
                  Rechercher
                </span>
              </button>
            )}
          </div>

          <div className="w-1/3 flex justify-center items-center">
            <Link to="/" className="hover:opacity-70 transition-opacity">
              <img src="/assets/Header_site_drapeau.png" alt="Jaelle & JC" className="h-[35px] md:h-[55px] w-auto object-contain" />
            </Link>
          </div>

          <div className="w-1/3 flex items-center justify-end gap-6">
            <button className="hover:opacity-50 transition-opacity"><User size={20} strokeWidth={1} /></button>
            <button className="hover:opacity-50 transition-opacity relative">
              <ShoppingBag size={20} strokeWidth={1} />
              <span className="absolute -top-1 -right-1 text-[8px] bg-black text-white w-3 h-3 rounded-full flex items-center justify-center font-sans">0</span>
            </button>
          </div>
        </div>

        {!isCollectionPage && (
          <div className="md:hidden px-6 pb-4">
            <button onClick={() => navigate('/collection')} className="w-full h-11 bg-neutral-50 border border-neutral-100 rounded-full flex items-center px-4 gap-3">
              <Search size={16} className="text-neutral-400" strokeWidth={1} />
              <span className="text-sans text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                Que recherchez-vous ?
              </span>
            </button>
          </div>
        )}
      </header>

      {/* NAVIGATION COLLECTIONS (Z-40) */}
      <nav className={`fixed left-0 w-full h-[45px] bg-white/90 backdrop-blur-md z-[40] border-b-[0.5px] border-neutral-50 flex items-center justify-center gap-10 md:gap-12 px-6 transition-all duration-300 ${isCollectionPage ? 'top-[65px]' : 'top-[120px] md:top-[65px]'}`}>
        <Link to="/collection" className="text-sans text-[10px] uppercase tracking-[0.3em] text-neutral-500 hover:text-black">Sacs</Link>
        <Link to="/collection" className="text-sans text-[10px] uppercase tracking-[0.3em] text-neutral-500 hover:text-black">Bébé</Link>
        <Link to="/collection" className="text-sans text-[10px] uppercase tracking-[0.3em] text-neutral-500 hover:text-black">Coffrets</Link>
      </nav>

      {/* MENU OVERLAY (Z-150) */}
      <div className={`fixed inset-0 bg-white z-[150] transition-transform duration-500 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-[65px] flex items-center justify-between px-6 md:px-12 border-b-[0.5px] border-neutral-100">
          <div className="w-1/3"></div>
          <div className="w-1/3 flex justify-center">
            <img src="/assets/Header_site_drapeau.png" alt="Jaelle & JC" className="h-[35px] md:h-[55px] w-auto object-contain" />
          </div>
          <div className="w-1/3 flex justify-end">
            <button onClick={() => setIsMenuOpen(false)}><X size={24} strokeWidth={1} /></button>
          </div>
        </div>
        
        <div className="flex flex-col h-[calc(100vh-65px)] justify-between px-12 py-12 max-w-2xl mx-auto">
          <nav className="flex flex-col gap-6 mt-10">
            {[
              { label: 'Accueil', path: '/' },
              { label: 'Collections', path: '/collection' },
              { label: 'Notre Promesse', path: '/notre-promesse' },
              { label: 'Le Journal', path: '/blog' },
              { label: 'Contact', path: '/contact' }
            ].map((item) => (
              <button 
                key={item.label}
                onClick={() => handleNavigation(item.path)} 
                className="text-left font-serif text-2xl md:text-3xl italic text-black hover:pl-4 transition-all duration-300 border-b border-neutral-50 py-3 tracking-wide"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex flex-col gap-6 items-start border-t border-neutral-100 pt-8">
            <a href="https://instagram.com/jaellejc" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sans text-[10px] uppercase tracking-[0.3em] text-neutral-500 hover:text-black transition-colors">
              <span className="w-8 h-[1px] bg-neutral-300"></span>
              Instagram
            </a>

            <button 
              onClick={() => window.location.href = "mailto:" + "contact" + "@" + "jaelleandjc.fr"}
              className="text-sans text-[10px] uppercase tracking-[0.3em] text-neutral-400 hover:text-black transition-colors"
            >
              Nous contacter par e-mail
            </button>
          </div>
        </div>
      </div>

      {/* CONTENU DE LA PAGE */}
      <main className={`flex-grow bg-white ${isCollectionPage ? 'pt-[110px]' : 'pt-[165px] md:pt-[110px]'}`}>
        {children}
      </main>

      <footer className="py-20 bg-neutral-50 mt-auto">
        <div className="text-center text-[10px] uppercase tracking-widest text-neutral-400">
          © 2026 Maison Jaelle & JC
        </div>
      </footer>
    </div>
  );
};

export default Layout;