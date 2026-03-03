import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'; // IA : Branchement du contexte d'authentification
import { CartProvider } from './contexts/CartContext'; // IA : Branchement du contexte Panier
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Checkout from './pages/Checkout';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail'; 
import Collection from './pages/Collection'; 
import NotrePromesse from './pages/NotrePromesse'; 
import Contact from './pages/Contact';
import Blog from './pages/Blog';

// Imports des pages légales
import LegalNotice from './pages/legal/LegalNotice';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import ShippingRefund from './pages/legal/ShippingRefund';
import TermsOfService from './pages/legal/TermsOfService';
import BlogPost from './pages/BlogPost';

function App() {
  return (
    /* IA : Emboîtement des providers pour une gestion globale des données client et du panier */
    <AuthProvider>
      <CartProvider>
        <Router>
          <Layout>
            <Routes>
              {/* Pages principales */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/collection" element={<Collection />} />
              <Route path="/notre-promesse" element={<NotrePromesse />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/contact" element={<Contact />} />
              
              {/* Section Journal */}
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:id" element={<BlogPost />} />

              {/* Pages Légales */}
              <Route path="/mentions-legales" element={<LegalNotice />} />
              <Route path="/confidentialite" element={<PrivacyPolicy />} />
              <Route path="/livraison-et-retours" element={<ShippingRefund />} />
              <Route path="/CGV" element={<TermsOfService />} />
              
              {/* Redirection automatique vers l'accueil si la page n'existe pas */}
              <Route path="*" element={<Home />} />
            </Routes>
          </Layout>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;