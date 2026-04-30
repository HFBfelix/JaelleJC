import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider, useCart } from './contexts/CartContext'; // Ajout de useCart

// Layout & Pages Publiques
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Collection from './pages/Collection';
import ProductDetail from './pages/ProductDetail';
import Success from './pages/Success';
import Contact from './pages/Contact';
import NotrePromesse from './pages/NotrePromesse';
import Checkout from './pages/Checkout';
import NewsletterPage from './pages/NewsletterPage';
import SmartSearchPOC from './pages/SmartSearchPOC';

// Blog
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';

// Pages Légales
import LegalNotice from './pages/legal/LegalNotice';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import ShippingRefund from './pages/legal/ShippingRefund';
import TermsOfService from './pages/legal/TermsOfService';

// Espace Créateur
import Dashboard from './pages/createur/Dashboard';

// UI Components
import ExitIntentPopup from './components/ui/ExitIntentPopup'; // Ajout du Popup

const CreateurRoute = ({ children }: { children: JSX.Element }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (!user || !profile?.isAdmin) { 
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Composant intermédiaire pour accéder au contexte du panier
const AppContent = () => {
  const { itemCount } = useCart();

  return (
    <Router>
      <Routes>
        {/* 🛠️ ESPACE CRÉATEUR (Isolé) */}
        <Route 
          path="/createur" 
          element={
            <CreateurRoute>
              <Dashboard />
            </CreateurRoute>
          } 
        />

        {/* 🏛️ ESPACE CLIENT (Sous Layout) */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/notre-promesse" element={<NotrePromesse />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/success" element={<Success />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/newsletter" element={<NewsletterPage />} />
          <Route path="/smart-search-poc" element={<SmartSearchPOC />} />
          
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:id" element={<BlogPost />} />

          <Route path="/mentions-legales" element={<LegalNotice />} />
          <Route path="/confidentialite" element={<PrivacyPolicy />} />
          <Route path="/livraison-et-retours" element={<ShippingRefund />} />
          <Route path="/CGV" element={<TermsOfService />} />

          <Route path="*" element={<Home />} />
        </Route>
      </Routes>

      {/* 💡 Écouteur d'intention de sortie (Popup de rétention) */}
      <ExitIntentPopup cartCount={itemCount} />
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;