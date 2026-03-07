import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { MapPin, User, Package, Check, LogOut, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    displayName: '',
    address: '',
    city: '',
    zipCode: '',
    phone: ''
  });

  // Charger les données du profil
  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        address: profile.address || '',
        city: profile.city || '',
        zipCode: profile.zipCode || '',
        phone: profile.phone || ''
      });
    }
  }, [profile]);

  // --- LOGIQUE CHIRURGICALE : RÉCUPÉRATION DES ACQUISITIONS ---
  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }

    // Requête temps réel pour l'historique des commandes
    const q = query(
      collection(db, "orders"), 
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
    }, (error) => {
      console.error("Erreur récupération acquisitions:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Erreur mise à jour profil:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (error) {
      console.error("Erreur déconnexion:", error);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="font-serif text-4xl italic mb-4">Votre Espace</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400">Gérez vos informations et vos acquisitions</p>
        </div>

        {/* Formulaire de profil */}
        <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-neutral-100 pb-2 mb-6">
              <User size={16} strokeWidth={1} />
              <span className="text-[10px] uppercase tracking-widest font-medium">Identité</span>
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-neutral-400">Nom Complet</label>
              <input 
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                className="w-full border-b border-neutral-100 py-2 text-sm outline-none focus:border-black transition-colors bg-transparent"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-neutral-400">Téléphone</label>
              <input 
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full border-b border-neutral-100 py-2 text-sm outline-none focus:border-black transition-colors bg-transparent"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-neutral-100 pb-2 mb-6">
              <MapPin size={16} strokeWidth={1} />
              <span className="text-[10px] uppercase tracking-widest font-medium">Livraison</span>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-neutral-400">Adresse</label>
              <input 
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full border-b border-neutral-100 py-2 text-sm outline-none focus:border-black transition-colors bg-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-neutral-400">Code Postal</label>
                <input 
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                  className="w-full border-b border-neutral-100 py-2 text-sm outline-none focus:border-black transition-colors bg-transparent"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-neutral-400">Ville</label>
                <input 
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="w-full border-b border-neutral-100 py-2 text-sm outline-none focus:border-black transition-colors bg-transparent"
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-2 pt-10">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-5 text-[10px] uppercase tracking-[0.4em] hover:bg-neutral-800 transition-all flex items-center justify-center gap-3 disabled:bg-neutral-300"
            >
              {loading ? "Mise à jour..." : saved ? <><Check size={14} /> Informations enregistrées</> : "Enregistrer les modifications"}
            </button>
          </div>
        </form>

        {/* Section Historique des Acquisitions */}
        <div className="mt-24">
          <div className="flex items-center gap-3 border-b border-neutral-100 pb-2 mb-10">
            <Package size={16} strokeWidth={1} />
            <span className="text-[10px] uppercase tracking-widest font-medium">Vos Acquisitions</span>
          </div>

          {orders.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-neutral-100">
              <p className="text-[11px] text-neutral-400 italic">Aucune commande pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="group border border-neutral-100 p-6 flex flex-col md:flex-row justify-between md:items-center gap-4 hover:border-black transition-colors duration-500">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-[9px] uppercase tracking-widest text-neutral-400">Réf. {order.id.slice(0, 8).toUpperCase()}</p>
                      <span className={`text-[7px] uppercase tracking-widest px-2 py-0.5 border ${order.status === 'paid' ? 'border-black text-black' : 'border-neutral-200 text-neutral-400'}`}>
                        {order.status === 'paid' ? 'Confirmée' : 'En attente'}
                      </span>
                    </div>
                    <h3 className="font-serif italic text-lg capitalize">
                      {order.items?.length > 0 ? order.items[0].name : 'Commande Jaelle & JC'}
                      {order.items?.length > 1 && <span className="text-sm not-italic ml-2 text-neutral-400"> (+{order.items.length - 1})</span>}
                    </h3>
                  </div>
                  <div className="flex items-end md:items-center gap-6">
                    <p className="font-light text-lg">{order.total} €</p>
                    <button className="text-neutral-300 group-hover:text-black transition-colors">
                      <ExternalLink size={14} strokeWidth={1} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Espace Client */}
        <div className="mt-24 border-t border-neutral-100 pt-10 flex flex-col items-center gap-8">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-neutral-400 hover:text-black transition-colors"
          >
            <LogOut size={14} strokeWidth={1} />
            Déconnexion
          </button>
          
          <div className="inline-flex items-center gap-2 text-neutral-300">
            <Package size={14} strokeWidth={1} />
            <span className="text-[9px] uppercase tracking-[0.2em]">Expéditions soignées depuis notre atelier</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;