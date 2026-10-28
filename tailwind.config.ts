import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // --- TES POLICES DE LUXE ---
      fontFamily: {
        serif: ["Crimson Pro", "serif"],        // Titres, direction « Atelier »
        sans: ["Source Sans 3", "sans-serif"],  // Texte, direction « Atelier »
      },
      // --- TAILLE DE TEXTE UX 2026 ---
      fontSize: {
        base: ["14px", "1.7"], // Ton corps de texte standardisé
      },
      colors: {
        // Palette sobre et chic
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "#FFFFFF",
        foreground: "#000000",
        galerie: "#F7F7F7", // Le gris iconique
        primary: {
          DEFAULT: "#000000",
          foreground: "#FFFFFF",
        },
      },
      // --- RÉGLAGES BORDURES ULTRA-FINES ---
      borderWidth: {
        DEFAULT: '0.5px',
      },
      borderRadius: {
        lg: "0px", // Pas d'arrondis pour un look "Atelier"
        md: "0px",
        sm: "0px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;