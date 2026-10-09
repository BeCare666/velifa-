import { createHmac, timingSafeEqual } from 'crypto';
import axios from 'axios';

/**
 * Vérification du jeton de session de l'Embedded SDK Salla (docs.salla.dev, Embedded SDK → Authentication) :
 * POST https://api.salla.dev/exchange-authority/v1/introspect, en-tête « S-Source: <App ID> », corps { token }.
 * Réponse : data.merchant_id, data.user_id, data.exp.
 */
export async function introspectSallaToken(token: string, appId: string): Promise<{ merchantId: string; userId: string | null } | null> {
  const { data } = await axios.post(
    'https://api.salla.dev/exchange-authority/v1/introspect',
    { token },
    { headers: { 'S-Source': appId, 'Content-Type': 'application/json', Accept: 'application/json' }, timeout: 10_000 },
  );
  const merchantId = data?.data?.merchant_id;
  if (merchantId == null) return null;
  return { merchantId: String(merchantId), userId: data?.data?.user_id != null ? String(data.data.user_id) : null };
}

/** Session VELIFA courte (1 h) pour un marchand déjà vérifié : base64url({m, exp}).signature HMAC. */
export const SESSION_TTL_MS = 3_600_000;

const b64 = (s: string) => Buffer.from(s).toString('base64url');

export function signMerchantSession(merchantId: string, key: string, now = Date.now()): { session: string; expiresAt: Date } {
  const exp = now + SESSION_TTL_MS;
  const body = b64(JSON.stringify({ m: merchantId, exp }));
  const sig = createHmac('sha256', `salla-session:${key}`).update(body).digest('base64url');
  return { session: `${body}.${sig}`, expiresAt: new Date(exp) };
}

/** Identifiant du marchand si la session est intacte et non expirée, sinon null. */
export function verifyMerchantSession(session: string | undefined, key: string, now = Date.now()): string | null {
  if (!session || !key) return null;
  const [body, sig] = session.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', `salla-session:${key}`).update(body).digest('base64url');
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const { m, exp } = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof m !== 'string' || !/^\d{1,20}$/.test(m) || typeof exp !== 'number' || exp < now) return null;
    return m;
  } catch {
    return null;
  }
}
