import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { ArrowRight, ShieldCheck, Edit2, CreditCard, Loader2 } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../lib/firebase';
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

// ─── FIELD SORTI DU COMPOSANT ─────────────────────────────────────────────
const Field = ({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-[9px] uppercase tracking-widest text-neutral-400">
      {label}{required && <span className="text-black ml-1">*</span>}
    </label>
    {children}
  </div>
);

const inputClass =
  'border-b border-neutral-300 py-2 outline-none focus:border-black text-sm font-serif italic placeholder:text-neutral-300 bg-transparent w-full';
// ─────────────────────────────────────────────────────────────────────────

const Checkout = () => {
  const { profile, user } = useAuth();
  const { cart, total } = useCart();
  const [step, setStep] = useState<'shipping' | 'review'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
  const [deliverySettings, setDeliverySettings] = useState({ freeThreshold: 0, flatRate: 0 });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    complement: '',
    zipCode: '',
    city: '',
  });

  // 1. Charger les réglages de livraison
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'delivery'), (snap) => {
      if (snap.exists()) setDeliverySettings(snap.data() as any);
    });
    return () => unsub();
  }, []);

  // 2. LOGIQUE SENIOR : Autocomplétion (Profil + Dernière Commande)
  useEffect(() => {
    const autoFillData = async () => {
      let dataToSet = { ...formData };

      // Priorité 1 : Données du profil
      if (profile) {
        const p = profile as any;
        dataToSet = {
          ...dataToSet,
          firstName: p.firstName || dataToSet.firstName,
          lastName: p.lastName || dataToSet.lastName,
          phone: p.phone || dataToSet.phone,
          address: p.address || dataToSet.address,
          zipCode: p.zipCode || dataToSet.zipCode,
          city: p.city || dataToSet.city,
        };
      }

      // Priorité 2 : Historique de commande (Récupération systématique si l'utilisateur est connu)
      if (user) {
        try {
          const q = query(
            collection(db, 'orders'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(1)
          );
          const snap = await getDocs(q);
          
          if (!snap.empty) {
            const last = snap.docs[0].data();
            // On injecte les données de la dernière commande si les champs actuels sont vides
            dataToSet = {
              ...dataToSet,
              firstName: dataToSet.firstName || last.customerName?.split(' ')[0] || '',
              lastName: dataToSet.lastName || last.customerName?.split(' ')[1] || '',
              phone: dataToSet.phone || last.customerPhone || '',
              address: dataToSet.address || last.shippingDetail?.address || '',
              complement: dataToSet.complement || last.shippingDetail?.complement || '',
              zipCode: dataToSet.zipCode || last.shippingDetail?.zipCode || '',
              city: dataToSet.city || last.shippingDetail?.city || '',
            };
          }
        } catch (error) {
          console.warn("Historique indisponible:", error);
        }
      }
      setFormData(dataToSet);
    };

    autoFillData();
  }, [profile, user]);

  const isFreeDelivery = deliverySettings.freeThreshold > 0 && total >= deliverySettings.freeThreshold;
  const deliveryFee = isFreeDelivery ? 0 : deliverySettings.flatRate || 0;
  const grandTotal = total + deliveryFee;

  const goToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.address || !formData.zipCode || !formData.city) {
      alert('Veuillez compléter tous les champs obligatoires (*).');
      return;
    }
    setStep('review');
    window.scrollTo(0, 0);
  };

  const handleFinalPayment = async () => {
    setIsProcessing(true);

    const fullAddress = [
      formData.address,
      formData.complement,
      `${formData.zipCode} ${formData.city}`,
      'France',
    ].filter(Boolean).join(', ');

    const shippingData = { ...formData, fullAddress, deliveryFee, grandTotal, email: user?.email || '' };
    
    localStorage.setItem('temp_shipping', JSON.stringify(shippingData));
    sessionStorage.setItem('temp_shipping', JSON.stringify(shippingData));
    sessionStorage.setItem('cart_backup', JSON.stringify(cart));
    sessionStorage.setItem('cart_total_backup', String(total));

    try {
      const createStripeCheckout = httpsCallable(functions, 'createStripeCheckout');
      const baseUrl = window.location.origin;

      const result: any = await createStripeCheckout({
        customerEmail: user?.email || '',
        cartItems: cart.map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
        deliveryFee,
        success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout`,
      });

      const { url } = result.data;
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Erreur Stripe:', err);
      setIsProcessing(false);
    }
  };

  if (cart.length === 0)
    return (
      <div className="min-h-screen flex items-center justify-center font-serif italic text-neutral-400">
        Votre sélection est vide.
      </div>
    );

  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6 font-sans antialiased">
      <div className="max-w-4xl mx-auto">

        <div className="flex gap-4 mb-12 text-[9px] uppercase tracking-[0.3em]">
          <span className={step === 'shipping' ? 'text-black font-bold' : 'text-neutral-300'}>01 Livraison</span>
          <span className="text-neutral-200">/</span>
          <span className={step === 'review' ? 'text-black font-bold' : 'text-neutral-300'}>02 Confirmation</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">

          <div>
            {step === 'shipping' ? (
              <form onSubmit={goToReview} className="space-y-8">
                <div>
                  <h2 className="font-serif text-3xl italic text-neutral-800 lowercase mb-2">Adresse de livraison</h2>
                  <p className="text-[9px] uppercase tracking-widest text-neutral-400">* Champs obligatoires</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <Field label="Prénom" required>
                    <input type="text" required placeholder="Marie" className={inputClass}
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                  </Field>
                  <Field label="Nom" required>
                    <input type="text" required placeholder="Dupont" className={inputClass}
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                  </Field>
                </div>

                <Field label="Téléphone" required>
                  <input type="tel" required placeholder="06 00 00 00 00" className={inputClass}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </Field>

                <Field label="Numéro et rue" required>
                  <input type="text" required placeholder="12 rue de la Paix" className={inputClass}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                </Field>

                <Field label="Complément d'adresse">
                  <input type="text" placeholder="Bât. B, 3ème étage" className={inputClass}
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })} />
                </Field>

                <div className="grid grid-cols-2 gap-6">
                  <Field label="Code postal" required>
                    <input type="text" required placeholder="75001" maxLength={5} className={inputClass}
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value.replace(/\D/g, '') })} />
                  </Field>
                  <Field label="Ville" required>
                    <input type="text" required placeholder="Paris" className={inputClass}
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                  </Field>
                </div>

                <button type="submit" className="w-full bg-black text-white py-6 flex items-center justify-center gap-4 group hover:bg-neutral-900 transition-all">
                  <span className="text-[10px] uppercase tracking-[0.4em]">Vérifier ma commande</span>
                  <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                </button>
              </form>
            ) : (
              <div className="space-y-10 animate-in fade-in duration-700">
                <div className="flex justify-between items-center">
                  <h2 className="font-serif text-3xl italic text-neutral-800 lowercase">Vérification</h2>
                  <button onClick={() => setStep('shipping')} className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-neutral-400 hover:text-black">
                    <Edit2 size={12} /> Modifier
                  </button>
                </div>
                <div className="space-y-5 text-sm font-serif italic text-neutral-600 bg-neutral-50 p-8 border-[0.5px] border-neutral-100">
                  <div>
                    <span className="not-italic text-[9px] uppercase tracking-widest text-neutral-400 block mb-1">Destinataire</span>
                    <p>{formData.firstName} {formData.lastName}</p>
                    <p className="text-neutral-400 text-[12px]">{formData.phone}</p>
                  </div>
                  <div>
                    <span className="not-italic text-[9px] uppercase tracking-widest text-neutral-400 block mb-1">Adresse</span>
                    <p>{formData.address}</p>
                    {formData.complement && <p>{formData.complement}</p>}
                    <p>{formData.zipCode} {formData.city}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border-[0.5px] border-neutral-100 p-8 lg:p-12 h-fit sticky top-32">
            <span className="text-[9px] uppercase tracking-[0.3em] text-neutral-500 block mb-8 text-center">Récapitulatif</span>
            <div className="space-y-6 mb-10">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div><span className="font-serif italic">{item.name}</span> {item.quantity > 1 && <span className="text-[9px] text-neutral-400 ml-2">×{item.quantity}</span>}</div>
                  <span className="font-light">{item.price * item.quantity} €</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t pt-6 mb-10">
              <div className="flex justify-between items-center text-[9px] uppercase tracking-widest text-neutral-400">
                <span>Sous-total</span><span>{total} €</span>
              </div>
              <div className="flex justify-between items-center text-[9px] uppercase tracking-widest text-neutral-400">
                <span>Livraison</span><span>{isFreeDelivery ? 'Offerte' : `${deliveryFee} €`}</span>
              </div>
              <div className="flex justify-between items-end pt-4 border-t border-neutral-50">
                <span className="text-[10px] uppercase tracking-widest font-bold">Total</span>
                <span className="text-3xl font-light">{grandTotal} €</span>
              </div>
            </div>

            {step === 'review' && (
              <button onClick={handleFinalPayment} disabled={isProcessing} className="w-full bg-black text-white py-6 flex items-center justify-center gap-4 hover:bg-neutral-900 transition-all disabled:bg-neutral-200">
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <><CreditCard size={14} /><span className="text-[10px] uppercase tracking-[0.4em]">Confirmer & Payer</span></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;