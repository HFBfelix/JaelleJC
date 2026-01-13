import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail'; 
import Collection from './pages/Collection'; 
import NotrePromesse from './pages/NotrePromesse'; 
import Contact from './pages/Contact';
import Blog from './pages/Blog'; // Import de la nouvelle page Journal

// Imports des pages légales
import LegalNotice from './pages/legal/LegalNotice';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import ShippingRefund from './pages/legal/ShippingRefund';
import TermsOfService from './pages/legal/TermsOfService';
import BlogPost from './pages/BlogPost'; // Ajoutez cet import

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Pages principales */}
          <Route path="/" element={<Home />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/notre-promesse" element={<NotrePromesse />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/contact" element={<Contact />} />
          
          // Modifiez la route blog existante :
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:id" element={<BlogPost />} /> {/* On utilise BlogPost ici */}

          {/* Section Journal (SEO Optimisé) */}
          <Route path="/blog" element={<Blog />} />
          {/* La route ci-dessous permettra d'afficher un article spécifique */}
          <Route path="/blog/:id" element={<Blog />} /> 
          
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
  );
}

export default App;