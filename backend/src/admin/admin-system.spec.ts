import { AdminService } from './admin.service';

function makeService(queue: any, dbOk = true) {
  const db: any = { pool: { query: dbOk ? jest.fn().mockResolvedValue([[{ 1: 1 }]]) : jest.fn().mockRejectedValue(new Error('down')) } };
  return new AdminService(db, queue, {} as any);
}

describe('AdminService.getSystem', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; jest.useRealTimers(); });

  it('interroge réellement Redis et renvoie l’état de la file', async () => {
    const counts = { waiting: 2, active: 1, completed: 10, failed: 3, delayed: 0 };
    const svc = makeService({ client: { ping: jest.fn().mockResolvedValue('PONG') }, getJobCounts: jest.fn().mockResolvedValue(counts) });
    const r = await svc.getSystem();
    expect(r.dbConnected).toBe(true);
    expect(r.redisConnected).toBe(true);
    expect(r.queue).toEqual(counts);
  });

  it('signale Redis en panne au lieu d’un « OK » fixe', async () => {
    const getJobCounts = jest.fn();
    const svc = makeService({ client: { ping: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) }, getJobCounts }, false);
    const r = await svc.getSystem();
    expect(r.redisConnected).toBe(false);
    expect(r.dbConnected).toBe(false);
    expect(r.queue).toBeNull();
    expect(getJobCounts).not.toHaveBeenCalled();
  });

  it('ne reste pas bloqué si Redis ne répond pas (délai de 3 s)', async () => {
    jest.useFakeTimers();
    const svc = makeService({ client: { ping: () => new Promise(() => undefined) }, getJobCounts: jest.fn() });
    const p = svc.getSystem();
    await jest.advanceTimersByTimeAsync(3100);
    expect((await p).redisConnected).toBe(false);
  });

  it('indique la présence des clés Brevo et Clerk sans renvoyer leur valeur', async () => {
    process.env.BREVO_API_KEY = 'secret-brevo';
    delete process.env.CLERK_SECRET_KEY;
    const svc = makeService({ client: { ping: jest.fn().mockResolvedValue('PONG') }, getJobCounts: jest.fn().mockResolvedValue({}) });
    const r = await svc.getSystem();
    expect(r.brevoConfigured).toBe(true);
    expect(r.clerkConfigured).toBe(false);
    expect(JSON.stringify(r)).not.toContain('secret-brevo');
  });
});
