/**
 * Sections « application » qui ont leur propre navigation (barre latérale) :
 * l'en-tête et le pied de page du site vitrine y sont masqués.
 * `pathname` doit être SANS préfixe de langue (usePathname de '@/navigation').
 */
const APP_SECTIONS = ['/dashboard', '/analyse/', '/audits', '/settings', '/billing', '/support', '/admin'];

export function isAppSection(pathname: string): boolean {
  return APP_SECTIONS.some((s) => pathname.startsWith(s));
}
