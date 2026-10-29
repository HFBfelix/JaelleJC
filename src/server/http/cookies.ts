// Options communes des cookies posés par le serveur : HttpOnly, SameSite=Lax, Path=/.
// Secure partout sauf sur l'ordinateur de développement servi en http (le navigateur y refuserait le cookie).
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

export const serverCookieOptions = (host: string | null, maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: !LOCAL_HOST.test(host ?? ''),
  sameSite: 'lax' as const,
  path: '/',
  maxAge: maxAgeSeconds,
});
