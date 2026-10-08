import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createIntlMiddleware(routing);

// Routes qui ne nécessitent PAS d'authentification
const isPublicRoute = createRouteMatcher([
  '/:locale',
  '/:locale/sign-in(.*)',
  '/:locale/sign-up(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/:locale/admin(.*)',           // Protection gérée côté composant uniquement
  '/:locale/tarifs(.*)',
  '/:locale/support(.*)',
  '/:locale/faq(.*)',
  '/:locale/a-propos(.*)',
  '/:locale/contact(.*)',
  '/:locale/fonctionnalites(.*)',
  '/:locale/mentions-legales(.*)',
  '/:locale/confidentialite(.*)',
  '/:locale/design(.*)',
  '/api/webhooks/(.*)',
  '/api/v1/(.*)',
]);

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

  // Passer le routing i18n pour les pages d'auth Clerk et l'API
  if (shouldSkipI18n(pathname)) {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
    return NextResponse.next();
  }

  // Protéger les routes privées
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  // Appliquer le middleware i18n (détection locale, redirections)
  return intlMiddleware(req);
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
