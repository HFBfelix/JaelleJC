'use client';

// Téléphone français (décision de Jaelle, 2026-11-04) : indicatif +33 fixe, bien visible avec le drapeau, puis le
// numéro national (« 6 12 34 56 78 » ou « 06 12 34 56 78 »). La valeur transmise est « +33… » ; le serveur la vérifie
// (src/server/checkout/phone.ts).
import { useId } from 'react';

export const toE164 = (national: string) => {
  const digits = national.replace(/\D/g, '').replace(/^0/, '');
  return digits ? `+33${digits}` : '';
};

export default function PhoneFR({ label, value, onChange, hint, autoComplete = 'tel' }: {
  label: string; value: string; onChange: (national: string) => void; hint?: string; autoComplete?: string;
}) {
  const id = useId();
  return (
    <div className="mb-4">
      <label htmlFor={id} className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 block mb-1">{label}</label>
      <div className="flex items-center gap-3 border-b-[0.5px] border-neutral-300 focus-within:border-black">
        <span className="text-[14px] whitespace-nowrap py-2" aria-label="Indicatif France +33">
          <span aria-hidden>🇫🇷</span> +33
        </span>
        <input id={id} required type="tel" inputMode="tel" maxLength={14} autoComplete={autoComplete} placeholder="6 12 34 56 78"
          value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? `${id}-aide` : undefined}
          className="flex-1 bg-transparent py-2 outline-none text-[14px] placeholder:text-neutral-300" />
      </div>
      {hint && <p id={`${id}-aide`} className="text-[13px] text-neutral-500 mt-1">{hint}</p>}
    </div>
  );
}
