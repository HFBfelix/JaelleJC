import React, { useState } from 'react';
import { X, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'login' | 'register' | 'forgot';

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // État pour la visibilité
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const reset = () => {
    setEmail(''); setPassword(''); setFirstName(''); setLastName(''); setPhone('');
    setError(''); setMessage(''); setLoading(false);
    setShowPassword(false);
    setMode('login');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleAuth = async () => {
    if (!email || (mode !== 'forgot' && !password)) return;
    if (mode === 'register' && (!firstName || !lastName || !phone)) {
      setError('Veuillez compléter tous les champs obligatoires.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    const auth = getAuth();

    try {
      if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const displayName = `${firstName} ${lastName}`;
        await updateProfile(cred.user, { displayName });
        const userRef = doc(db, "users", cred.user.uid);
        const existing = await getDoc(userRef);
        if (!existing.exists()) {
          await setDoc(userRef, {
            uid: cred.user.uid,
            email: cred.user.email,
            displayName,
            firstName,
            lastName,
            phone,
            address: '', city: '', zipCode: '',
            createdAt: new Date(),
          });
        }
        handleClose();
      } else if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        handleClose();
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setMessage('Un lien de réinitialisation a été envoyé.');
        setTimeout(() => setMode('login'), 3000);
      }
    } catch (err: any) {
      const msgs: Record<string, string> = {
        'auth/email-already-in-use': 'Cet email est déjà utilisé.',
        'auth/user-not-found': 'Aucun compte avec cet email.',
        'auth/wrong-password': 'Mot de passe incorrect.',
        'auth/invalid-credential': 'Email ou mot de passe incorrect.',
        'auth/weak-password': 'Mot de passe trop court (6 caractères min).',
        'auth/invalid-email': 'Adresse email invalide.',
      };
      setError(msgs[err.code] || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Style harmonisé avec l'interface Atelier
  const inputClass = "w-full py-3 outline-none bg-transparent text-[11px] tracking-widest  placeholder:text-neutral-300 transition-colors uppercase";

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[500]" onClick={handleClose} />
      <div className="fixed inset-0 z-[501] flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-white p-10 md:p-14 relative">
          <button onClick={handleClose}
            className="absolute top-6 right-6 hover:rotate-90 transition-transform duration-300">
            <X size={18} strokeWidth={1} />
          </button>

          <div className="mb-10">
            {mode === 'forgot' && (
              <button onClick={() => setMode('login')} className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-neutral-400 mb-4 hover:text-black transition-colors">
                <ArrowLeft size={10} /> Retour
              </button>
            )}
            <span className="text-[9px] uppercase tracking-[0.5em] text-neutral-400 block mb-3">
              Jaelle & JC
            </span>
            <h2 className="font-serif text-3xl italic">
              {mode === 'login' && 'Se connecter'}
              {mode === 'register' && 'Créer un compte'}
              {mode === 'forgot' && 'Réinitialiser'}
            </h2>
          </div>

          <div className="space-y-8">
            {/* CHAMPS REGISTER UNIQUEMENT */}
            {mode === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-6">
                  {/* Prénom */}
                  <div className="border-b border-neutral-100 focus-within:border-black transition-colors">
                    <input
                      type="text"
                      placeholder="PRÉNOM *"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  {/* Nom */}
                  <div className="border-b border-neutral-100 focus-within:border-black transition-colors">
                    <input
                      type="text"
                      placeholder="NOM *"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Téléphone */}
                <div className="border-b border-neutral-100 focus-within:border-black transition-colors">
                  <input
                    type="tel"
                    placeholder="TÉLÉPHONE *"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </>
            )}

            {/* Email */}
            <div className="border-b border-neutral-100 focus-within:border-black transition-colors">
              <input type="email" placeholder="ADRESSE EMAIL *" value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                className={inputClass}
              />
            </div>

            {mode !== 'forgot' && (
              <div className="border-b border-neutral-100 focus-within:border-black transition-colors relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="MOT DE PASSE *" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors"
                >
                  {showPassword ? <EyeOff size={16} strokeWidth={1} /> : <Eye size={16} strokeWidth={1} />}
                </button>
              </div>
            )}

            {mode === 'register' && (
              <p className="text-[9px] text-neutral-300 uppercase tracking-widest -mt-4">
                * Tous les champs sont obligatoires
              </p>
            )}

            {error && <p className="text-[10px] text-red-400 uppercase tracking-widest">{error}</p>}
            {message && <p className="text-[10px] text-green-600 uppercase tracking-widest italic">{message}</p>}

            <button onClick={handleAuth} disabled={loading}
              className="w-full bg-black text-white py-5 text-[10px] uppercase tracking-[0.4em]
                hover:bg-neutral-800 transition-all disabled:bg-neutral-300">
              {loading ? '...' : mode === 'login' ? 'Se connecter' : mode === 'register' ? 'Créer mon compte' : 'Envoyer le lien'}
            </button>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            {mode === 'login' && (
              <button
                onClick={() => setMode('forgot')}
                className="text-[9px] uppercase tracking-[0.3em] text-neutral-400 hover:text-black transition-colors"
              >
                Mot de passe oublié ?
              </button>
            )}

            <button
              onClick={() => {
                setMode(mode === 'register' ? 'login' : 'register');
                setError('');
                setMessage('');
              }}
              className="text-[9px] uppercase tracking-[0.3em] text-neutral-400
                hover:text-black transition-colors border-b border-transparent hover:border-neutral-400 pb-0.5"
            >
              {mode === 'register' ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? En créer un'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginModal;