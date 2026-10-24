import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      '.next/**',
      'next-env.d.ts',
      'tailwind.config.ts', // repris à l'identique de l'ancien site (CLAUDE.md §2)
      'legacy/**',
      'functions/**',
      'scripts/**',
      'tests/rules/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
];

export default config;
