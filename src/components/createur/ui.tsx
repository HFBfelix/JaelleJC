import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

// Éléments de l'espace créatrice : design de l'ancien Dashboard (fond crème #F5F2EE, cartes blanches, lignes fines),
// typographie Atelier (aucun texte sous 11 px, pas d'italique).
export const label = 'text-[11px] uppercase tracking-[0.12em] text-neutral-500';

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`bg-white border-[0.5px] border-neutral-300 p-6 ${className}`}>{children}</div>
);

export const AdminTitle = ({ children, action }: { children: ReactNode; action?: ReactNode }) => (
  <div className="flex items-end justify-between gap-4 mb-8">
    <h1 className="font-serif text-3xl">{children}</h1>
    {action}
  </div>
);

export const Input = ({ label: text, hint, ...input }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) => (
  <label className="block mb-6">
    <span className={`${label} block mb-2`}>{text}</span>
    <input {...input} className="w-full bg-transparent border-b-[0.5px] border-neutral-400 focus:border-black py-2 outline-none text-[14px]" />
    {hint && <span className="text-[13px] text-neutral-500 block mt-2">{hint}</span>}
  </label>
);

export const TextArea = ({ label: text, hint, ...area }: { label: string; hint?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <label className="block mb-6">
    <span className={`${label} block mb-2`}>{text}</span>
    <textarea {...area} className="w-full bg-white border-[0.5px] border-neutral-300 focus:border-black p-3 outline-none text-[14px] leading-relaxed resize-y" />
    {hint && <span className="text-[13px] text-neutral-500 block mt-2">{hint}</span>}
  </label>
);

export const Button = ({ children, variant = 'primary', ...props }:
  { children: ReactNode; variant?: 'primary' | 'secondary' | 'text' } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const styles = {
    primary: 'bg-black text-white px-6 py-3 hover:bg-neutral-800 disabled:bg-neutral-300',
    secondary: 'border-[0.5px] border-black bg-white px-6 py-3 hover:bg-neutral-50 disabled:opacity-40',
    text: 'text-neutral-600 hover:text-black border-b-[0.5px] border-neutral-400 pb-0.5 disabled:opacity-40',
  }[variant];
  return (
    <button type="button" {...props} className={`${styles} transition-colors disabled:cursor-not-allowed ${props.className ?? ''}`}>
      <span className="text-[11px] uppercase tracking-[0.12em]">{children}</span>
    </button>
  );
};

export const Message = ({ children }: { children: ReactNode }) => (
  <p role="status" className="text-[14px] border-l border-black pl-4 my-4">{children}</p>
);

export const StatusBadge = ({ status }: { status: 'draft' | 'published' | 'archived' }) => {
  const text = { draft: 'Brouillon', published: 'En ligne', archived: 'Archivé' }[status];
  return (
    <span className={`text-[11px] uppercase tracking-[0.12em] px-2 py-0.5 border-[0.5px] ${status === 'published' ? 'border-black bg-black text-white' : 'border-neutral-400 text-neutral-600'}`}>
      {text}
    </span>
  );
};

// « 45,50 » → 4550 ; saisie invalide → null.
export function eurosToCents(value: string): number | null {
  const v = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(v)) return null;
  return Math.round(Number(v) * 100);
}
export const centsToEuros = (cents: number) => (cents ? (cents / 100).toFixed(2).replace('.', ',').replace(/,00$/, '') : '');
