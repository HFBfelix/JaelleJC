import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  confirmPasswordReset // Importation nécessaire pour la réinitialisation
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate, useSearchParams } from 'react-router-dom'; // Ajout de useSearchParams

type AuthMode = 'login' | 'register' | 'forgot' | 'resetPassword'; // Ajout du mode 'resetPassword'

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); // Pour lire les paramètres d'URL
  const [oobCode, setOobCode] = useState<string | null>(null); // Pour stocker le code de réinitialisation
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Détecte si l'utilisateur arrive via un lien de réinitialisation de mot de passe
  useEffect(() => {
    if (searchParams.get('mode') === 'resetPassword' && searchParams.get('oobCode')) {
      setMode('resetPassword');
      setOobCode(searchParams.get('oobCode'));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (mode === 'register') {
        // 1. Création du compte Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Mise à jour du nom dans le profil Auth
        await updateProfile(user, { displayName: name });

        // 3. Création du profil client dans Firestore (pour l'Agent IA)
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          displayName: name,
          email: email,
          createdAt: new Date(),
          address: '', // Sera complété plus tard par le client
          city: '',
          zipCode: ''
        });

      } else if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === 'forgot') {
        // Même réponse que l'e-mail existe ou non (pas d'énumération des comptes).
        await sendPasswordResetEmail(auth, email).catch(() => {});
        setMessage("Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.");
        return;
      } else if (mode === 'resetPassword' && oobCode) { // Nouvelle logique pour la réinitialisation
        if (newPassword !== confirmNewPassword) {
          setError("Les mots de passe ne correspondent pas.");
          return;
        }
        await confirmPasswordReset(auth, oobCode, newPassword);
        setMessage("Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.");
        setMode('login'); // Redirige vers la connexion après succès
        setNewPassword('');
        setConfirmNewPassword('');
        return; // Important pour ne pas naviguer vers /collection
      }
      navigate('/collection'); // Redirection après succès
    } catch (err: any) {
      if (mode === 'resetPassword' && (err?.code === 'auth/expired-action-code' || err?.code === 'auth/invalid-action-code')) {
        setError("Ce lien a expiré ou a déjà servi. Demandez un nouveau lien.");
      } else if (err?.code === 'auth/weak-password') {
        setError("Mot de passe trop court : 6 caractères minimum.");
      } else {
        setError("Une erreur est survenue. Vérifiez vos informations.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="max-w-sm w-full">
        <h1 className="font-serif text-3xl italic mb-2 text-center">
          {mode === 'register' ? 'Rejoindre Jaelle & JC' : mode === 'forgot' ? 'Réinitialisation' : mode === 'resetPassword' ? 'Nouveau mot de passe' : 'Se connecter'}
        </h1>
        <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-12 text-center">
          {mode === 'register' ? 'Créez votre profil client' : mode === 'forgot' ? 'Entrez votre email' : mode === 'resetPassword' ? 'Définissez votre nouveau mot de passe' : 'Accédez à votre espace'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="NOM COMPLET"
              className="w-full border-b border-neutral-100 py-3 text-[11px] tracking-widest outline-none focus:border-black transition-colors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          {mode !== 'resetPassword' && (
            <input
              type="email"
              placeholder="EMAIL"
              className="w-full border-b border-neutral-100 py-3 text-[11px] tracking-widest outline-none focus:border-black transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
          {(mode === 'login' || mode === 'register') && (
            <input
              type="password"
              placeholder="MOT DE PASSE"
              className="w-full border-b border-neutral-100 py-3 text-[11px] tracking-widest outline-none focus:border-black transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
          {mode === 'resetPassword' && ( // Affichage des champs pour le nouveau mot de passe
            <>
              <input
                type="password"
                placeholder="NOUVEAU MOT DE PASSE"
                className="w-full border-b border-neutral-100 py-3 text-[11px] tracking-widest outline-none focus:border-black transition-colors"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="CONFIRMER MOT DE PASSE"
                className="w-full border-b border-neutral-100 py-3 text-[11px] tracking-widest outline-none focus:border-black transition-colors"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
            </>
          )}

          {error && <p className="text-[9px] text-red-400 uppercase tracking-widest text-center">{error}</p>}
          {message && <p className="text-[9px] text-green-600 uppercase tracking-widest text-center">{message}</p>}

          <button className="w-full bg-black text-white py-5 text-[10px] uppercase tracking-[0.4em] hover:bg-neutral-800 transition-all mt-8">
            {mode === 'register' ? "Créer mon compte" : mode === 'forgot' ? "Envoyer le lien" : mode === 'resetPassword' ? "Réinitialiser le mot de passe" : "Connexion"}
          </button>
        </form>

        <div className="flex flex-col gap-4 mt-8">
          {mode === 'login' && (
            <button 
              onClick={() => setMode('forgot')}
              className="text-[9px] uppercase tracking-[0.2em] text-neutral-400 hover:text-black transition-colors"
            >
              Mot de passe oublié ?
            </button>
          )}
          
          <button 
            onClick={() => setMode(mode === 'register' ? 'login' : 'register')} // Bascule entre connexion et inscription
            className="text-[9px] uppercase tracking-[0.2em] text-neutral-400 hover:text-black transition-colors"
          >
            {mode === 'register' ? "Déjà un compte ? Se connecter" : "Pas encore de compte ? S'inscrire"}
          </button>
          
          {(mode === 'forgot' || mode === 'resetPassword') && ( // Bouton de retour pour les deux modes de réinitialisation
            <button onClick={() => setMode('login')} className="text-[9px] uppercase tracking-[0.2em] text-black">
              Retour à la connexion
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;