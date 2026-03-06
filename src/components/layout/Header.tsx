import React, { useState } from 'react';
import { Search, User, ShoppingBag, X, Menu } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Header = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isCollectionPage = location.pathname === '/collection';

  const handleNavigation = (path: string) => {
    setIsMenuOpen(false); // Ferme le menu après le clic
    navigate(path);
  };

  return (
    <>
      <header className="fixed top-0 left-0 w-full bg-white border-b-[0.5px] border-neutral-200 z-50">
        <div className="h-[65px] flex items-center px-4 md:px-12">
          
          <div className="flex-1 flex items-center gap-4 md:gap-8">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="hover:opacity-60 transition-opacity flex items-center gap-2"
            >
              <Menu size={20} strokeWidth={1.2} />
              <span className="text-sans text-[11px] uppercase tracking-[0.2em] hidden md:block text-black">Menu</span>
            </button>

            {/* Loupe adaptative */}
            <button 
              onClick={() => setIsSearchOpen(true)}
              className={`items-center gap-3 text-sans text-[11px] uppercase tracking-[0.15em] hover:opacity-60 transition-opacity 
                ${isCollectionPage ? 'flex' : 'hidden md:flex'}`}
            >
              <Search size={17} strokeWidth={1.2} />
              <span className="hidden md:block text-black">Rechercher</span>
            </button>
          </div>

          <div className="flex-none w-[150px] md:w-[200px] flex justify-center items-center">
            <Link to="/" className="hover:opacity-70 transition-opacity">
              <img src="/assets/Header_site_drapeau.png" alt="Jaelle & JC" className="h-[35px] md:h-[50px] w-auto object-contain" />
            </Link>
          </div>

          <div className="flex-1 flex items-center justify-end gap-5 md:gap-8">
            <Link to="/account" className="hover:opacity-60 transition-opacity text-black"><User size={19} strokeWidth={1.2} /></Link>
            <Link to="/cart" className="hover:opacity-60 transition-opacity relative text-black">
              <ShoppingBag size={19} strokeWidth={1.2} />
              <span className="absolute -top-1 -right-1 text-[8px] bg-black text-white w-3 h-3 rounded-full flex items-center justify-center font-sans font-bold">0</span>
            </Link>
          </div>
        </div>

        {!isCollectionPage && (
          <div className="md:hidden px-4 pb-4">
            <div onClick={() => setIsSearchOpen(true)} className="w-full h-11 bg-neutral-50 border border-neutral-100 rounded-full flex items-center px-5 gap-3 cursor-pointer">
              <Search size={15} className="text-neutral-400" strokeWidth={1.5} />
              <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-light">Que recherchez-vous ?</span>
            </div>
          </div>
        )}

        <nav className="h-[45px] border-t-[0.5px] border-neutral-100 flex items-center justify-center gap-8 md:gap-12 bg-white">
          <Link to="/collection" className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 hover:text-black">Femmes</Link>
          <Link to="/collection" className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 hover:text-black">Bébé</Link>
          <Link to="/collection" className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 hover:text-black">Coffrets</Link>
        </nav>
      </header>

      {/* OVERLAY MENU : CORRIGÉ POUR LA VISIBILITÉ */}
      <div className={`fixed inset-0 bg-white z-[100] transition-transform duration-500 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-[65px] flex items-center justify-between px-6 md:px-12 border-b-[0.5px] border-neutral-200">
          <div className="flex-1"></div>
          <p className="font-serif text-lg italic text-black">Jaelle & JC</p>
          <div className="flex-1 flex justify-end">
            <button onClick={() => setIsMenuOpen(false)} className="text-black hover:rotate-90 transition-transform">
              <X size={24} strokeWidth={1} />
            </button>
          </div>
        </div>
        
        {/* Conteneur des items de navigation */}
        <nav className="flex flex-col gap-6 mt-16 px-8 md:px-24">
          <button onClick={() => handleNavigation('/')} className="text-left font-serif text-4xl md:text-5xl italic text-black hover:pl-4 transition-all duration-300 border-b border-neutral-50 py-2">Accueil</button>
          <button onClick={() => handleNavigation('/collection')} className="text-left font-serif text-4xl md:text-5xl italic text-black hover:pl-4 transition-all duration-300 border-b border-neutral-50 py-2">Collections</button>
          <button onClick={() => handleNavigation('/notre-promesse')} className="text-left font-serif text-4xl md:text-5xl italic text-black hover:pl-4 transition-all duration-300 border-b border-neutral-50 py-2">Notre Promesse</button>
          <button onClick={() => handleNavigation('/blog')} className="text-left font-serif text-4xl md:text-5xl italic text-black hover:pl-4 transition-all duration-300 border-b border-neutral-50 py-2">Blog</button>
          <button onClick={() => handleNavigation('/contact')} className="text-left font-serif text-4xl italic text-black hover:pl-4 transition-all duration-300 border-b border-neutral-50 py-2">Contact</button>
        </nav>
      </div>

      {/* OVERLAY RECHERCHE */}
      <div className={`fixed inset-0 bg-white z-[90] transition-transform duration-500 ease-in-out ${isSearchOpen ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="h-[65px] flex items-center justify-between px-6 md:px-12 border-b-[0.5px] border-neutral-200">
          <div className="flex-1"></div>
          <p className="font-serif text-lg italic text-black">Jaelle & JC</p>
          <div className="flex-1 flex justify-end">
            <button onClick={() => setIsSearchOpen(false)} className="text-black"><X size={24} strokeWidth={1} /></button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-32 px-6">
          <input type="text" placeholder="Que recherchez-vous ?" className="w-full text-center font-serif text-3xl md:text-5xl outline-none text-black placeholder:text-neutral-500" autoFocus={isSearchOpen} />
        </div>
      </div>

      <div className={`${!isCollectionPage ? 'h-[155px]' : 'h-[110px]'}`}></div>
    </>
  );
};

export default Header;