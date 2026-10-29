'use client';

import { createContext, useContext, type ReactNode } from 'react';

// État de connexion lu côté serveur (cookie de session vérifié) : sert seulement à l'affichage.
// Toute action protégée revérifie la session sur le serveur.
const SessionContext = createContext(false);

export const SessionProvider = ({ signedIn, children }: { signedIn: boolean; children: ReactNode }) => (
  <SessionContext.Provider value={signedIn}>{children}</SessionContext.Provider>
);

export const useSignedIn = () => useContext(SessionContext);
