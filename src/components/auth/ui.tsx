import type { InputHTMLAttributes, ReactNode } from 'react';

// Éléments communs des pages de connexion et du compte : mêmes lignes fines et petites capitales que le site.
export const AuthPage = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="max-w-md mx-auto px-6 py-16 md:py-24">
    <h1 className="font-serif text-3xl md:text-4xl mb-12">{title}</h1>
    {children}
  </div>
);

export const Field = ({ label, hint, ...input }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) => (
  <label className="block mb-8">
    <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 block mb-2">{label}</span>
    <span className="block border-b border-neutral-200 focus-within:border-black transition-colors">
      <input {...input} className="w-full bg-transparent py-3 outline-none text-[14px] placeholder:text-neutral-300" />
    </span>
    {hint && <span className="text-[14px] text-neutral-500 block mt-3">{hint}</span>}
  </label>
);

export const PrimaryButton = ({ children, ...props }: { children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...props}
    className="w-full bg-black text-white py-5 hover:bg-neutral-900 transition-colors disabled:bg-neutral-200 disabled:cursor-not-allowed">
    <span className="text-[11px] uppercase tracking-[0.12em]">{children}</span>
  </button>
);

export const SecondaryButton = ({ children, ...props }: { children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...props}
    className="w-full border-[0.5px] border-black py-5 hover:bg-neutral-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
    <span className="text-[11px] uppercase tracking-[0.12em]">{children}</span>
  </button>
);

export const TextButton = ({ children, ...props }: { children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button type="button" {...props}
    className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 hover:text-black border-b-[0.5px] border-neutral-300 pb-1">
    {children}
  </button>
);

export const Notice = ({ children }: { children: ReactNode }) => (
  <p role="status" className="text-[14px] leading-relaxed border-l border-black pl-5 my-8">{children}</p>
);
