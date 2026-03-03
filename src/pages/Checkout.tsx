import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowRight, Lock, ShieldCheck } from 'lucide-react';

const Checkout = () => {
  const { profile, user } = useAuth();
  const { cart, total, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);

  // IA : Simulation de la création de commande et redirection SumUp
  const handlePayment = async () => {
    if (!user) {
      alert("Veuillez vous connecter pour finaliser votre acquisition.");
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Enregistrement de la commande dans Firestore
      const orderData = {
        userId: user.uid,
        customerName: profile?.displayName || "Client Jaelle & JC",
        items: cart,
        amount: total,
        status: 'pending', // En attente de confirmation SumUp
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "orders"), orderData);

      // 2. Logique SumUp (Lien de paiement dynamique)
      // Note : Dans une version de production, on appellerait ici une Firebase Function 
      // pour générer un Checkout ID sécurisé via l'API SumUp.
      
      console.log("Commande créée ID:", docRef.id);
      
      // Simulation redirection SumUp
      // window.location.href = `https://checkout.sumup.com/pay/v1/...`;
      
      alert("Redirection vers la plateforme de paiement sécurisée SumUp...");
      
    } catch (error) {
      console.error("Erreur commande:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <p className="font-serif italic text-xl text-neutral-400 mb-8">Votre sélection est vide.</p>
        <a href="/collection" className="text-[10px] uppercase tracking-widest border-b border-black pb-1">Retourner à la collection</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20">
        
        {/* COLONNE GAUCHE : Informations de livraison */}
        <div>
          <h2 className="font-serif text-3xl italic mb-10 text-neutral-800 tracking-tight">Finaliser l'acquisition</h2>
          
          <div className="space-y-8">
            <div className="border-b border-neutral-100 pb-6">
              <span className="text-[9px] uppercase tracking-[0.3em] text-neutral-400 block mb-4">Contact & Livraison</span>
              <p className="text-sm font-light">{profile?.displayName || "Non renseigné"}</p>
              <p className="text-sm font-light text-neutral-500">{profile?.email}</p>
              <p className="text-sm font-light text-neutral-500 mt-2">
                {profile?.address ? `${profile.address}, ${profile.city}` : "Adresse de livraison à compléter dans votre profil"}
              </p>
            </div>

            <div className="bg-neutral-50 p-6 space-y-4">
              <div className="flex items-center gap-3 text-neutral-400">
                <ShieldCheck size={16} strokeWidth={1} />
                <span className="text-[9px] uppercase tracking-widest">Paiement 100% Sécurisé</span>
              </div>
              <div className="flex items-center gap-3 text-neutral-400">
                <Lock size={16} strokeWidth={1} />
                <span className="text-[9px] uppercase tracking-widest">Données cryptées via SumUp®</span>
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE : Résumé & Paiement */}
        <div className="bg-white border-[0.5px] border-neutral-100 p-8 lg:p-12 shadow-sm h-fit">
          <span className="text-[9px] uppercase tracking-[0.3em] text-neutral-400 block mb-8 text-center">Récapitulatif</span>
          
          <div className="space-y-6 mb-10">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <span className="font-serif italic">{item.name}</span>
                <span className="font-light">{item.price} €</span>
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-100 pt-6 mb-10">
            <div className="flex justify-between items-end">
              <span className="text-[10px] uppercase tracking-widest">Total de l'ordre</span>
              <span className="text-3xl font-light">{total} €</span>
            </div>
            <p className="text-[8px] text-neutral-400 uppercase tracking-widest mt-4 text-center">Expédition standard offerte</p>
          </div>

          <button 
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full bg-black text-white py-6 flex items-center justify-center gap-4 group hover:bg-neutral-800 transition-all disabled:bg-neutral-200"
          >
            <span className="text-[10px] uppercase tracking-[0.4em]">Procéder au paiement</span>
            <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default Checkout;