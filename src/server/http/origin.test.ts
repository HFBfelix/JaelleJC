// Même site exigé par les routes de l'Atelier : en-tête absent, « null », mal formé ou autre site refusés.
import { expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: vi.fn() }));
const { isSameOrigin } = await import('./origin');

it('même site : accepté', () => {
  expect(isSameOrigin('http://localhost:3000', 'localhost:3000')).toBe(true);
  expect(isSameOrigin('https://www.jaellejc.com', 'www.jaellejc.com')).toBe(true);
});

it.each([
  [null, 'localhost:3000'], ['null', 'localhost:3000'], ['::::', 'localhost:3000'], ['', 'localhost:3000'],
  ['https://evil.example', 'www.jaellejc.com'], ['https://www.jaellejc.com.evil.example', 'www.jaellejc.com'],
  ['https://www.jaellejc.com', null],
])('origine %s pour %s : refusée', (origin, host) => expect(isSameOrigin(origin, host)).toBe(false));
