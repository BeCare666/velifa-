import { SseService, SseEvent } from './sse.service';

describe('SseService (écran d\'audit en direct)', () => {
  it('transmet les étapes réelles du worker aux abonnés, dans l\'ordre', () => {
    const sse = new SseService();
    const received: SseEvent[] = [];
    sse.getStream('a1').subscribe((e) => received.push(e));

    sse.emit('a1', { status: 'processing', step: 'performance' });
    sse.emit('a1', { status: 'processing', step: 'inspection' });
    sse.emit('a1', { status: 'processing', step: 'report' });

    expect(received.map((e) => e.step)).toEqual(['performance', 'inspection', 'report']);
    expect(received.every((e) => e.analysisId === 'a1' && e.status === 'processing')).toBe(true);
  });

  it('n\'envoie rien aux abonnés d\'une autre analyse', () => {
    const sse = new SseService();
    const received: SseEvent[] = [];
    sse.getStream('a1').subscribe((e) => received.push(e));
    sse.emit('a2', { status: 'processing', step: 'performance' });
    expect(received).toHaveLength(0);
  });

  it('ferme le flux après un état final', () => {
    jest.useFakeTimers();
    const sse = new SseService();
    let completed = false;
    sse.getStream('a1').subscribe({ complete: () => { completed = true; } });
    sse.emit('a1', { status: 'completed' });
    expect(completed).toBe(false);
    jest.advanceTimersByTime(5000);
    expect(completed).toBe(true);
    expect(sse.activeStreams).toBe(0);
    jest.useRealTimers();
  });
});
