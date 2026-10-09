import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Chiffrement des jetons OAuth des marchands au repos (AES-256-GCM).
 * Format : base64(iv[12] | tag[16] | chiffré). Clé : 32 octets en hexadécimal (MARKETPLACE_TOKEN_KEY).
 */
function keyFrom(hex: string): Buffer {
  if (!/^[0-9a-f]{64}$/i.test(hex ?? '')) throw new Error('MARKETPLACE_TOKEN_KEY invalide (64 caractères hexadécimaux attendus)');
  return Buffer.from(hex, 'hex');
}

export function encryptToken(plain: string, hexKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(hexKey), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64');
}

export function decryptToken(payload: string, hexKey: string): string {
  const buf = Buffer.from(payload, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', keyFrom(hexKey), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
}
