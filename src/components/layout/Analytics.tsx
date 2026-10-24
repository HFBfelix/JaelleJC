'use client';

import { useEffect } from 'react';
import { readConsent, shouldLoadAnalytics } from '@/lib/consent';

const GA_ID = 'G-BHFEM85RCJ';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

// RGPD : Google Analytics chargé seulement après « Tout accepter » (repris de legacy/index.html).
// « Tout accepter » recharge la page (CookieBanner), ce composant prend alors le relais.
export default function Analytics() {
  useEffect(() => {
    if (!shouldLoadAnalytics(readConsent(window.localStorage))) return;
    if (document.querySelector('script[data-ga]')) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    script.dataset.ga = 'true';
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer ?? [];
    window.gtag = function gtag() {
      // gtag attend l'objet `arguments`, pas un tableau.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
  }, []);

  return null;
}
