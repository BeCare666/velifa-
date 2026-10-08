import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createIntlMiddleware(routing);

// Seules ces routes exigent une connexion (avec ou sans préfixe de langue).
// Tout le reste est public : accueil, tarifs, rapport partagé (/analyse/:id), pages légales…
// L'espace admin est protégé côté serveur (API) ; la page vérifie aussi côté composant.
const PRIVATE_SECTIONS = ['dashboard', 'audits', 'billing', 'settings'];
const isPrivateRoute = createRouteMatcher(
  PRIVATE_SECTIONS.flatMap((s) => [`/${s}(.*)`, `/:locale/${s}(.*)`]),
);

// Chemins à exclure du routing i18n (Clerk, assets, api)
function shouldSkipI18n(pathname: string): boolean {
  return (
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  );
}

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { pathname } = req.nextUrl;

  if (isPrivateRoute(req)) {
    await auth.protect();
  }

  if (shouldSkipI18n(pathname)) {
    return NextResponse.next();
  }

  // Applique le middleware i18n (détection locale, redirections)
  return intlMiddleware(req);
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
