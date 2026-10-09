import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Vérification des webhooks Salla, stratégie « Signature » (docs.salla.dev, section Webhooks / Security) :
 * en-tête X-Salla-Security-Strategy = Signature, en-tête X-Salla-Signature = HMAC-SHA256 hexadécimal du corps brut
 * avec le secret saisi dans le portail partenaire. Comparaison à temps constant. Toute autre stratégie est refusée.
 */
export function verifySallaSignature(
  rawBody: Buffer | undefined,
  strategy: string | undefined,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!secret || !rawBody || !signature) return false;
  if ((strategy ?? '').toLowerCase() !== 'signature') return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const received = signature.trim().toLowerCase();
  if (received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}
