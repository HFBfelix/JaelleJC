import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getAnalytics, logEvent } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, 'us-central1');

// Local uniquement (`npm run dev:emulateurs`) : base fictive, jamais la vraie.
// import.meta.env.DEV est faux dans le site publié, ce bloc y est retiré.
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

// Stripe.js n'est plus chargé sur chaque page : le paiement redirige vers la page hébergée par Stripe
// (session créée par la fonction createStripeCheckout), aucun script tiers avant consentement.

// RGPD : Analytics uniquement après « Tout accepter » (CookieBanner recharge la page après le choix).
const hasAnalyticsConsent = () => {
  if (import.meta.env.VITE_USE_EMULATORS === 'true') return false; // jamais en visualisation locale
  try {
    return localStorage.getItem('jaellejc-cookies') === 'all';
  } catch {
    return false;
  }
};

export const analytics = typeof window !== "undefined" && hasAnalyticsConsent() ? getAnalytics(app) : null;

export const trackEvent = (eventName: string, params?: object) => {
  if (analytics) {
    logEvent(analytics, eventName, params);
  }
};

export default app;