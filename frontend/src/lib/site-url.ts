/**
 * Adresse saisie par un visiteur → URL acceptée par l'API (qui exige http:// ou https://).
 * « monsite.com » → « https://monsite.com » ; une adresse avec schéma est laissée telle quelle
 * (le backend refuse ensuite tout ce qui n'est pas http/https).
 */
export function normalizeSiteUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return v;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) return v;
  return `https://${v.replace(/^\/+/, '')}`;
}
