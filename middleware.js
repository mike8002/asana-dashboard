export { default } from 'next-auth/middleware';

// Protect all routes except /login and /api/auth
export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)'],
};
