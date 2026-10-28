'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// Barre « Écrin » de l'accueil, reprise de legacy/src/pages/Home.tsx.
const HomeSearch = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) router.push(`/collection?search=${encodeURIComponent(searchTerm)}`);
  };

  return (
    <div className="max-w-[600px] mx-auto">
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          aria-label="Chercher une pièce"
          placeholder="Chercher une pièce, un usage..."
          className="w-full py-4 text-center text-xl md:text-2xl font-serif italic outline-none bg-transparent placeholder:text-neutral-500 border-b border-neutral-200 focus:border-black transition-all duration-700"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </form>

      <div className="mt-[4vh] flex flex-wrap justify-center gap-x-12 gap-y-4">
        {['Cabas', 'Naissance', 'Lin'].map((tag) => (
          <button
            key={tag}
            onClick={() => router.push(`/collection?search=${tag}`)}
            className="text-[10px] uppercase tracking-[0.4em] text-neutral-400 hover:text-black transition-colors"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
};

export default HomeSearch;
