'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { AnalysisStatus, AnalysisStep, SseEvent } from '@/types/analysis';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const POLL_MS = 4000;

/**
 * Suivi d'une analyse en cours.
 * - SSE : le backend envoie des événements NOMMÉS `analysis-update` (étapes réelles du worker) ;
 *   `onmessage` ne reçoit que les événements sans nom, d'où `addEventListener`.
 * - Interrogation périodique en parallèle : filet de sécurité si l'analyse se termine avant
 *   l'ouverture du flux (aucun événement ne serait alors envoyé) ou si le flux est coupé.
 */
export function useAnalysisStatus(analysisId: string | null) {
  const [status, setStatus] = useState<AnalysisStatus>('pending');
  const [step, setStep]     = useState<AnalysisStep | null>(null);
  const [url, setUrl]       = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!analysisId) return;
    let done = false;

    const finish = (next: AnalysisStatus) => {
      if (done) return;
      if (next === 'completed') {
        done = true;
        setStatus('completed');
        router.push(`/analyse/${analysisId}`);
      } else if (next === 'failed') {
        done = true;
        setStatus('failed');
        setFailed(true);
      }
    };

    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/analyses/${analysisId}`);
        if (!res.ok) return;
        const { data } = await res.json();
        if (data?.url) setUrl(data.url);
        if (data?.status === 'completed' || data?.status === 'failed') finish(data.status);
        else if (data?.status && !done) setStatus((s) => (s === 'pending' ? data.status : s));
      } catch { /* réseau : on réessaie au prochain tour */ }
    };

    poll();
    const interval = setInterval(() => { if (!done) poll(); }, POLL_MS);

    let es: EventSource | null = null;
    try {
      es = new EventSource(`${API_URL}/analyses/${analysisId}/stream`);
      es.addEventListener('analysis-update', (e) => {
        try {
          const event: SseEvent = JSON.parse((e as MessageEvent).data);
          if (event.step) setStep(event.step);
          if (event.status === 'completed' || event.status === 'failed') finish(event.status);
          else setStatus(event.status);
        } catch { /* événement illisible ignoré */ }
      });
      // Flux coupé : l'interrogation périodique prend le relais.
      es.onerror = () => es?.close();
    } catch { /* EventSource indisponible : interrogation seule */ }

    return () => {
      done = true;
      clearInterval(interval);
      es?.close();
    };
  }, [analysisId, router]);

  return { status, step, url, failed };
}
