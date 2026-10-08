import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { verifyTurnstile, DEV_BYPASS_TOKEN } from './turnstile';

const ok   = async () => ({ success: true });
const ko   = async () => ({ success: false });
const down = async () => { throw new Error('ECONNRESET'); };

describe('verifyTurnstile', () => {
  it('développement sans clé : contournement', async () => {
    await expect(verifyTurnstile(DEV_BYPASS_TOKEN, '1.2.3.4', { secret: '', nodeEnv: 'development' }))
      .resolves.toBe('bypassed-dev');
  });

  it('production sans clé : bloque (échec fermé)', async () => {
    await expect(verifyTurnstile('x', '1.2.3.4', { secret: '', nodeEnv: 'production' }))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('production : la valeur d’exemple du .env.example compte comme absente', async () => {
    await expect(verifyTurnstile('x', '1.2.3.4', { secret: 'your_turnstile_secret', nodeEnv: 'production' }))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('clé configurée : le jeton de contournement est refusé (même en dev)', async () => {
    await expect(verifyTurnstile(DEV_BYPASS_TOKEN, '1.2.3.4', { secret: 's', nodeEnv: 'development', post: ok }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('clé configurée : jeton invalide refusé', async () => {
    await expect(verifyTurnstile('tok', '1.2.3.4', { secret: 's', nodeEnv: 'production', post: ko }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('clé configurée : jeton valide accepté', async () => {
    await expect(verifyTurnstile('tok', '1.2.3.4', { secret: 's', nodeEnv: 'production', post: ok }))
      .resolves.toBe('verified');
  });

  it('production : Cloudflare injoignable → bloque', async () => {
    await expect(verifyTurnstile('tok', '1.2.3.4', { secret: 's', nodeEnv: 'production', post: down }))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('développement : Cloudflare injoignable → toléré', async () => {
    await expect(verifyTurnstile('tok', '1.2.3.4', { secret: 's', nodeEnv: 'development', post: down }))
      .resolves.toBe('bypassed-dev');
  });

  it('envoie secret, jeton et IP à Cloudflare', async () => {
    let sent = '';
    await verifyTurnstile('tok', '1.2.3.4', {
      secret: 's', nodeEnv: 'production',
      post: async (_u, body) => { sent = body; return { success: true }; },
    });
    expect(new URLSearchParams(sent).get('response')).toBe('tok');
    expect(new URLSearchParams(sent).get('remoteip')).toBe('1.2.3.4');
  });
});
