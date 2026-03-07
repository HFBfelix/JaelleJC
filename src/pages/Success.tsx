import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { db, auth, functions } from '../lib/firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';

const Success = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { cart, total, clearCart } = useCart();
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const hasProcessed = useRef(false);

  const sessionId = searchParams.get('session_id');
  const isPaid = !!sessionId;

  useEffect(() => {
    window.scrollTo(0, 0);

    // ─── AJOUT SÉCURITÉ : NETTOYAGE URL DOUBLÉE ───────────────────────────
    const currentUrl = window.location.href;
    if (currentUrl.includes('?session_id=') && currentUrl.split('?').length > 2) {
      const parts = currentUrl.split('?');
      const cleanUrl = parts[0] + '?' + parts[1];
      window.history.replaceState({}, '', cleanUrl);
    }
    // ─────────────────────────────────────────────────────────────────────

    if (!isPaid) { setStatus('done'); return; }

    let unsubscribe: (() => void) | null = null;

    const processOrder = async (currentUser: any) => {
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      try {
        // --- 1. RÉCUPÉRATION SÉCURISÉE DES DÉTAILS STRIPE ---
        let stripeDetails = { paymentIntentId: '', fingerprint: '' };
        try {
            const getStripeSession = httpsCallable(functions, 'getStripeSessionDetails');
            const result: any = await getStripeSession({ sessionId });
            if (result.data) {
              stripeDetails = {
                paymentIntentId: result.data.paymentIntentId || '',
                fingerprint: result.data.fingerprint || ''
              };
            }
        } catch (e) {
            console.warn("⚠️ Détails Stripe étendus non récupérés :", e);
        }

        // --- 2. RÉCUPÉRATION DES DONNÉES DE COMMANDE ---
        const raw =
          localStorage.getItem('temp_shipping') ||
          sessionStorage.getItem('temp_shipping') ||
          '{}';
        const shipping = JSON.parse(raw);

        const cartBackupRaw = sessionStorage.getItem('cart_backup');
        const cartToSave =
          cart.length > 0
            ? cart
            : cartBackupRaw
            ? JSON.parse(cartBackupRaw)
            : [];

        const totalToSave =
          shipping.grandTotal ||
          total ||
          Number(sessionStorage.getItem('cart_total_backup') || 0);

        // Si vraiment rien à sauver, on arrête
        if (cartToSave.length === 0) {
          setStatus('done');
          return;
        }

        console.log("💎 [STRIPE] Session ID détecté :", sessionId);

        // --- 3. NETTOYAGE PRÉVENTIF (UX FLUIDE) ---
        clearCart();
        localStorage.removeItem('temp_shipping');
        sessionStorage.removeItem('temp_shipping');
        sessionStorage.removeItem('cart_backup');
        sessionStorage.removeItem('cart_total_backup');

        // --- 4. ENREGISTREMENT FIREBASE ---
        const orderRef = await addDoc(collection(db, 'orders'), {
          userId: currentUser?.uid || 'guest',
          customerName:
            `${shipping.firstName || ''} ${shipping.lastName || ''}`.trim() ||
            currentUser?.displayName ||
            '',
          customerEmail: currentUser?.email || shipping.email || '',
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
          
          // TRAÇABILITÉ STRIPE
          stripeSessionId: sessionId,
          stripePaymentIntentId: stripeDetails.paymentIntentId,
          cardFingerprint: stripeDetails.fingerprint,
          
          status: 'paid',
          createdAt: serverTimestamp(),
        });

        console.log("✅ [FIREBASE] Commande scellée avec ID :", orderRef.id);
        setStatus('done');

      } catch (error: any) {
        console.error('❌ [ERROR] Échec finalisation :', error);
        if (error?.code === 'permission-denied') {
          hasProcessed.current = false; // Retry possible
        } else {
          setStatus('error');
        }
      }
    };

    // Listener Auth
    unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (hasProcessed.current) return;
      if (!currentUser) return; // On attend le timeout pour les guests
      if (unsubscribe) unsubscribe();
      await processOrder(currentUser);
    });

    // Timeout 8s pour forcer l'écriture si l'auth est lente ou absente (Guest)
    const timeout = setTimeout(async () => {
      if (!hasProcessed.current) {
        if (unsubscribe) unsubscribe();
        await processOrder(null);
      }
    }, 8000);

    return () => {
      clearTimeout(timeout);
      if (unsubscribe) unsubscribe();
    };
  }, [isPaid, clearCart, cart, total, sessionId]);

  // --- RENDU ---
  if (isPaid && status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F5F2EE] flex flex-col items-center justify-center">
        <Loader2 size={24} strokeWidth={1} className="animate-spin text-neutral-400 mb-6" />
        <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-400">
          Confirmation en cours…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2EE] flex flex-col items-center justify-center px-6 text-center">
      <div className="bg-white p-12 md:p-20 border border-neutral-100 max-w-2xl w-full shadow-sm">
        {isPaid && status !== 'error' ? (
          <>
            <CheckCircle size={40} strokeWidth={0.5} className="mx-auto mb-10 text-neutral-800" />
            <span className="text-[10px] uppercase tracking-[0.6em] text-neutral-500 block mb-6">
              Jaelle & JC
            </span>
            <h1 className="font-serif text-5xl italic mb-6">Merci.</h1>
            <p className="text-[13px] text-neutral-800 font-light italic mb-4">
              Votre pièce est en préparation.
            </p>
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
            <span className="text-[10px] uppercase tracking-[0.6em] text-neutral-500 block mb-6">
              Jaelle & JC
            </span>
            <h1 className="font-serif text-4xl italic mb-6">Paiement reçu.</h1>
            <p className="text-[13px] text-neutral-600 font-light italic mb-4">
              Votre paiement a bien été encaissé. Nous vous confirmerons votre commande par email.
            </p>
            <p className="text-[11px] text-neutral-400 uppercase tracking-widest mb-12">
              Sans nouvelles sous 24h : contact@jaellejc.com
            </p>
            <button
              onClick={() => navigate('/collection')}
              className="bg-black text-white px-12 py-5 text-[10px] uppercase tracking-[0.4em] hover:bg-neutral-900 transition-all"
            >
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
            <button
              onClick={() => navigate('/checkout')}
              className="text-[10px] uppercase tracking-widest border-b border-black pb-1"
            >
              Retourner au paiement
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Success;