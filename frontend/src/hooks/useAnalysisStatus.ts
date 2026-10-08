'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { AnalysisStatus, SseEvent } from '@/types/analysis';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export function useAnalysisStatus(analysisId: string | null) {
  const [status, setStatus] = useState<AnalysisStatus>('pending');
  const [error, setError]   = useState<string | null>(null);
  const router = useRouter();

  const startPolling = useCallback((id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/analyses/${id}`);
        if (!res.ok) return;
        const { data } = await res.json();
        setStatus(data.status);
        if (data.status === 'completed') {
          clearInterval(interval);
          router.push(`/analyse/${id}`);
        }
        if (data.status === 'failed') {
          clearInterval(interval);
          setError('Analyse échouée. Veuillez réessayer.');
        }
      } catch { /* silent */ }
    }, 4000);
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    if (!analysisId) return;

    let es: EventSource | null = null;

    try {
      es = new EventSource(`${API_URL}/analyses/${analysisId}/stream`);

      es.onmessage = (e) => {
        try {
          const event: SseEvent = JSON.parse(e.data);
          setStatus(event.status);
          if (event.status === 'completed') {
            es?.close();
            router.push(`/analyse/${analysisId}`);
          }
          if (event.status === 'failed') {
            es?.close();
            setError('Analyse échouée. Veuillez réessayer.');
          }
        } catch { /* silent */ }
      };

      es.onerror = () => {
        es?.close();
        // Fallback to polling on SSE failure
        startPolling(analysisId);
      };
    } catch {
      startPolling(analysisId);
    }

    return () => es?.close();
  }, [analysisId, router, startPolling]);

  return { status, error };
}
