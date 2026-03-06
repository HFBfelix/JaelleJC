import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const Success = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { cart, total, clearCart } = useCart();
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');

  const sessionId = searchParams.get('session_id');
  const isPaid = !!sessionId;
  const hasProcessed = useRef(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!isPaid) { setStatus('done'); return; }

    // Attendre que Firebase Auth soit prêt avant d'écrire la commande
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (hasProcessed.current) return;
      if (!currentUser) return; // Attendre encore — Firebase pas encore prêt

      hasProcessed.current = true;
      unsubscribe(); // On a ce qu'il faut, on se désabonne

      try {
        // Récupérer les données shipping (localStorage en priorité, sessionStorage en backup)
        const raw = localStorage.getItem('temp_shipping') || sessionStorage.getItem('temp_shipping') || '{}';
        const shipping = JSON.parse(raw);

        // Récupérer le panier (état React ou backup sessionStorage)
        const cartBackupRaw = sessionStorage.getItem('cart_backup');
        const cartToSave = cart.length > 0 ? cart : (cartBackupRaw ? JSON.parse(cartBackupRaw) : []);
        const totalToSave = shipping.grandTotal || total || Number(sessionStorage.getItem('cart_total_backup') || 0);

        if (cartToSave.length === 0) {
          // Commande déjà traitée ou panier introuvable
          setStatus('done');
          return;
        }

        await addDoc(collection(db, "orders"), {
          userId: currentUser.uid,
          customerName: `${shipping.firstName || ''} ${shipping.lastName || ''}`.trim() || currentUser.displayName || '',
          customerEmail: currentUser.email || '',
          customerPhone: shipping.phone || '',
          shippingAddress: shipping.fullAddress || shipping.address || '',
          shippingDetail: {
            address: shipping.address || '',
            complement: shipping.complement || '',
            zipCode: shipping.zipCode || '',
            city: shipping.city || '',
          },
          items: cartToSave.map((item: any) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image || '',
          })),
          total: totalToSave,
          deliveryFee: shipping.deliveryFee || 0,
          stripeSessionId: sessionId,
          status: 'paid',
          createdAt: serverTimestamp(),
        });

        // Nettoyer tout
        clearCart();
        localStorage.removeItem('temp_shipping');
        sessionStorage.removeItem('temp_shipping');
        sessionStorage.removeItem('cart_backup');
        sessionStorage.removeItem('cart_total_backup');

        setStatus('done');

      } catch (error) {
        console.error("Erreur finalisation commande:", error);
        setStatus('error');
      }
    });

    // Timeout de sécurité : si Firebase ne répond pas en 10s
    const timeout = setTimeout(() => {
      if (!hasProcessed.current) {
        console.error("Timeout : Firebase Auth n'a pas répondu");
        setStatus('error');
        unsubscribe();
      }
    }, 10000);

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [isPaid]);

  // Écran de chargement pendant que Firebase Auth se réinitialise
  if (isPaid && status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F5F2EE] flex flex-col items-center justify-center">
        <Loader2 size={24} strokeWidth={1} className="animate-spin text-neutral-400 mb-6" />
        <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-400">Confirmation en cours…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2EE] flex flex-col items-center justify-center px-6 text-center">
      <div className="bg-white p-12 md:p-20 border border-neutral-100 max-w-2xl w-full shadow-sm">
        {isPaid && status !== 'error' ? (
          <>
            <CheckCircle size={40} strokeWidth={0.5} className="mx-auto mb-10 text-neutral-800" />
            <span className="text-[10px] uppercase tracking-[0.6em] text-neutral-500 block mb-6">Jaelle & JC</span>
            <h1 className="font-serif text-5xl italic mb-6">Merci.</h1>
            <p className="text-[13px] text-neutral-800 font-light italic mb-4">Votre pièce est en préparation.</p>
            <p className="text-[11px] text-neutral-500 uppercase tracking-widest mb-12">
              Un email de confirmation vous a été envoyé · Livraison estimée : 15 jours ouvrés
            </p>
            <button
              onClick={() => navigate('/collection')}
              className="bg-black text-white px-12 py-5 text-[10px] uppercase tracking-[0.4em] hover:bg-neutral-900 transition-all"
            >
              Continuer mes achats
            </button>
          </>
        ) : isPaid && status === 'error' ? (
          <>
            <CheckCircle size={40} strokeWidth={0.5} className="mx-auto mb-10 text-neutral-800" />
            <span className="text-[10px] uppercase tracking-[0.6em] text-neutral-500 block mb-6">Jaelle & JC</span>
            <h1 className="font-serif text-4xl italic mb-6">Paiement reçu.</h1>
            <p className="text-[13px] text-neutral-600 font-light italic mb-4">
              Votre paiement a bien été encaissé. Un email vous sera envoyé dès confirmation.
            </p>
            <p className="text-[11px] text-neutral-400 uppercase tracking-widest mb-12">
              Si vous ne recevez rien sous 24h, contactez-nous à contact@jaellejc.com
            </p>
            <button onClick={() => navigate('/collection')}
              className="bg-black text-white px-12 py-5 text-[10px] uppercase tracking-[0.4em] hover:bg-neutral-900 transition-all">
              Continuer mes achats
            </button>
          </>
        ) : (
          <>
            <AlertCircle size={40} strokeWidth={0.5} className="mx-auto mb-10 text-neutral-400" />
            <h1 className="font-serif text-3xl italic mb-6">Paiement non confirmé</h1>
            <p className="text-[13px] text-neutral-600 font-light mb-12 lowercase">
              Votre panier est conservé. Vous pouvez reprendre votre commande.
            </p>
            <button onClick={() => navigate('/checkout')}
              className="text-[10px] uppercase tracking-widest border-b border-black pb-1">
              Retourner au paiement
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Success;