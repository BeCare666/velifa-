import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const API_METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'];

/** Préfixe des routes publiques du widget (appelées depuis les sites des agences). */
export const WIDGET_PATH_PREFIX = '/api/v1/widget/';

/**
 * CORS par route :
 * - widget : toute origine acceptée par le navigateur, SANS cookies ni en-tête Authorization ;
 *   l'origine est ensuite vérifiée par le contrôleur contre les domaines déclarés par l'agence ;
 * - reste de l'API : uniquement le frontend VELIFA (liste fixe), avec authentification.
 */
export function corsOptionsFor(path: string, allowedOrigins: string[]): CorsOptions {
  if (path.startsWith(WIDGET_PATH_PREFIX)) {
    return { origin: true, methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type'], credentials: false, maxAge: 600 };
  }
  return { origin: allowedOrigins, methods: API_METHODS, allowedHeaders: ['Content-Type', 'Authorization', 'Accept'], credentials: true };
}
