'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { api } from '@/lib/api';
import type { SubscriptionInfo, SubscriptionPlan, SubscriptionStatus } from '@/types/subscription';

// ── Persistance localStorage ────────────────────────────────────────────────
const LS_KEY = 'velifa_sub_cache';

function loadCachedInfo(): SubscriptionInfo | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SubscriptionInfo;
    // Valider que c'est bien du bon format
    if (parsed && typeof parsed.subscription_plan !== 'undefined') return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveCachedInfo(info: SubscriptionInfo): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(info)); } catch { /* ignore */ }
}

function clearCachedInfo(): void {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}

// ── Context shape ──────────────────────────────────────────────────────────
interface SubscriptionContextValue {
  plan:      SubscriptionPlan;
  status:    SubscriptionStatus;
  isActive:  boolean;
  isLoading: boolean;
  refresh:   () => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  plan:      null,
  status:    null,
  isActive:  false,
  isLoading: false,
  refresh:   () => {},
});

// ── Provider ───────────────────────────────────────────────────────────────
export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, getToken } = useAuth();

  /**
   * IMPORTANT — toujours initialiser à null côté SSR (server + premier render client).
   * Le localStorage est chargé dans un useEffect (client-only) pour éviter la
   * hydration mismatch : le serveur ne connaît pas localStorage.
   */
  const [info, setInfo] = useState<SubscriptionInfo>({
    subscription_plan:   null,
    subscription_status: null,
  });
  const [isLoading, setLoading] = useState(false);

  // Flag pour distinguer "jamais fetchée" vs "fetch échouée"
  const hasFetched = useRef(false);

  /**
   * Chargement du cache localStorage — uniquement côté client, après hydration.
   * Cela évite tout mismatch SSR ↔ client.
   */
  useEffect(() => {
    if (!isSignedIn) return;
    if (hasFetched.current) return; // Ne pas écraser un vrai fetch déjà fait
    const cached = loadCachedInfo();
    if (cached?.subscription_plan) {
      setInfo(cached);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  const fetchPlan = useCallback(async () => {
    if (!isSignedIn) {
      clearCachedInfo();
      setInfo({ subscription_plan: null, subscription_status: null });
      hasFetched.current = false;
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const res = await api.getMyPlan(token);
      const freshInfo = res.data;

      if (freshInfo && freshInfo.subscription_plan !== undefined) {
        hasFetched.current = true;
        setInfo(freshInfo);
        saveCachedInfo(freshInfo);
      }
    } catch (err: any) {
      const status = err?.statusCode ?? err?.status ?? 0;
      const is429  = status === 429 || String(err?.message).includes('Too Many');

      if (is429) {
        // Throttlé → garder le plan en mémoire, ne rien écraser
        console.warn('[SubscriptionContext] 429 — plan conservé');
      } else {
        // Erreur réseau → tenter le cache (mais ne pas réinitialiser le state si déjà bon)
        if (!hasFetched.current) {
          const cached = loadCachedInfo();
          if (cached?.subscription_plan) setInfo(cached);
        }
        console.warn('[SubscriptionContext] Erreur fetch plan:', err?.message);
      }
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, getToken]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  const isActive = info.subscription_plan != null && info.subscription_status === 'active';

  return (
    <SubscriptionContext.Provider value={{
      plan:      info.subscription_plan,
      status:    info.subscription_status,
      isActive,
      isLoading,
      refresh:   fetchPlan,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useSubscription() {
  return useContext(SubscriptionContext);
}
