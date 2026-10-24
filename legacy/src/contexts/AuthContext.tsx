import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  phone?: string;
  createdAt: any;
  isAdmin?: boolean; // Ajout du flag Admin
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // 1. Récupération du profil client classique
          const userDocRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          
          // 2. VÉRIFICATION WHITELIST (Indispensable pour l'Espace Créateur)
          // On cherche si l'email de l'utilisateur est dans 'autorisations'
          const adminDocRef = doc(db, "autorisations", currentUser.email!);
          const adminSnap = await getDoc(adminDocRef);
          const isAdmin = adminSnap.exists() && adminSnap.data().actif === true;

          if (userSnap.exists()) {
            // On fusionne les données de profil avec le statut Admin
            setProfile({ ...(userSnap.data() as UserProfile), isAdmin });
          } else {
            const newProfile = {
              uid: currentUser.uid,
              email: currentUser.email!,
              createdAt: new Date(),
              isAdmin // Même un nouveau compte peut être admin si l'email est whitelisted
            };
            await setDoc(userDocRef, {
              uid: newProfile.uid,
              email: newProfile.email,
              createdAt: newProfile.createdAt
            });
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Erreur AuthContext:", error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = () => firebaseSignOut(auth);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  }
  return context;
};