import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export interface SseEvent {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  analysisId: string;
  redirectUrl?: string;
}

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private readonly subjects = new Map<string, Subject<SseEvent>>();

  /** Creates or retrieves the Subject for a given analysisId */
  getStream(analysisId: string): Observable<SseEvent> {
    if (!this.subjects.has(analysisId)) {
      this.subjects.set(analysisId, new Subject<SseEvent>());
    }
    return this.subjects.get(analysisId)!.asObservable();
  }

  /** Emits an event to all listeners for a given analysisId */
  emit(analysisId: string, event: Partial<SseEvent>): void {
    const subject = this.subjects.get(analysisId);
    if (subject) {
      subject.next({ analysisId, ...event } as SseEvent);
      if (event.status === 'completed' || event.status === 'failed') {
        // Clean up after terminal state
        setTimeout(() => this.cleanup(analysisId), 5000);
      }
    }
  }

  private cleanup(analysisId: string): void {
    const subject = this.subjects.get(analysisId);
    if (subject) {
      subject.complete();
      this.subjects.delete(analysisId);
      this.logger.debug(`SSE stream closed for ${analysisId}`);
    }
  }

  get activeStreams(): number {
    return this.subjects.size;
  }
}
