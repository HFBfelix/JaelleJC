import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegister) {
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

      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/collection'); // Redirection après succès
    } catch (err: any) {
      setError("Identifiants incorrects ou compte déjà existant.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="max-w-sm w-full">
        <h1 className="font-serif text-3xl italic mb-2 text-center">
          {isRegister ? 'Rejoindre Jaelle & JC' : 'Se connecter'}
        </h1>
        <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-12 text-center">
          {isRegister ? 'Créez votre profil client' : 'Accédez à votre espace'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegister && (
            <input
              type="text"
              placeholder="NOM COMPLET"
              className="w-full border-b border-neutral-100 py-3 text-[11px] tracking-widest outline-none focus:border-black transition-colors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="EMAIL"
            className="w-full border-b border-neutral-100 py-3 text-[11px] tracking-widest outline-none focus:border-black transition-colors"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="MOT DE PASSE"
            className="w-full border-b border-neutral-100 py-3 text-[11px] tracking-widest outline-none focus:border-black transition-colors"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-[9px] text-red-400 uppercase tracking-widest text-center">{error}</p>}

          <button className="w-full bg-black text-white py-5 text-[10px] uppercase tracking-[0.4em] hover:bg-neutral-800 transition-all mt-8">
            {isRegister ? "Créer mon compte" : "Connexion"}
          </button>
        </form>

        <button 
          onClick={() => setIsRegister(!isRegister)}
          className="w-full mt-8 text-[9px] uppercase tracking-[0.2em] text-neutral-400 hover:text-black transition-colors"
        >
          {isRegister ? "Déjà un compte ? Se connecter" : "Pas encore de compte ? S'inscrire"}
        </button>
      </div>
    </div>
  );
};

export default Auth;