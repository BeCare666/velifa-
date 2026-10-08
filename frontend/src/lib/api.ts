import type { Analysis, AnalysisComparison, CreateAnalysisResponse, MyAudit } from '@/types/analysis';
import type { SubscriptionInfo } from '@/types/subscription';

const BASE_URL   = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/** Télécharge un export CSV admin avec le jeton Clerk (aucune clé dans l'URL). */
async function downloadAdminExport(kind: string, token: string | null | undefined, path = `/admin/export/${kind}`) {
  if (!token) throw new Error('Session expirée — reconnectez-vous.');
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Export impossible (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `velifa_${kind}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

interface ApiFetchOptions extends RequestInit {
  authToken?: string | null;
}

async function apiFetch<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  const { authToken, headers: extraHeaders, ...rest } = options ?? {};
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string> | undefined),
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...rest, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const apiErr = new Error((body as any).message ?? `API error ${res.status}`) as Error & { statusCode: number };
    apiErr.statusCode = res.status;
    throw apiErr;
  }
  return res.json() as Promise<T>;
}

export const api = {
  createAnalysis: (body: {
    url: string; email?: string; cfTurnstileToken?: string; locale?: string; force?: boolean;
  }, authToken?: string | null) =>
    apiFetch<CreateAnalysisResponse>('/analyses', {
      method: 'POST',
      body: JSON.stringify(body),
      authToken,
    }),

  getAnalysis: (id: string) => apiFetch<{ data: Analysis }>(`/analyses/${id}`),

  compareAnalyses: (id: string, otherId: string) =>
    apiFetch<{ data: AnalysisComparison }>(`/analyses/${encodeURIComponent(id)}/compare/${encodeURIComponent(otherId)}`),

  getMine: (authToken: string) =>
    apiFetch<{ data: MyAudit[]; timestamp: string }>('/analyses/mine', { authToken }),

  createCheckout: (body: { plan: 'pro' | 'business'; email?: string }, authToken: string) =>
    apiFetch<{ data: { checkoutUrl: string | null; upgraded: boolean } }>('/payments/checkout', {
      method: 'POST',
      body: JSON.stringify(body),
      authToken,
    }),

  getMyPlan: (authToken: string) =>
    apiFetch<{ data: SubscriptionInfo }>('/payments/me', { authToken }),

  sendReportEmail: (id: string, email: string, authToken?: string | null) =>
    apiFetch<{ data: { sent: boolean } }>(`/analyses/${id}/send-email`, {
      method: 'POST',
      body: JSON.stringify({ email }),
      authToken,
    }),

  // ── Admin (jeton Clerk obligatoire ; l'accès est vérifié côté serveur) ─────────
  admin: {
    getStats:    (token?: string | null) => apiFetch<any>('/admin/stats',    { authToken: token }),
    getActivity: (token?: string | null) => apiFetch<any>('/admin/activity', { authToken: token }),
    getUsers:    (token: string | null | undefined, params: Record<string, string>) =>
      apiFetch<any>(`/admin/users?${new URLSearchParams(params)}`, { authToken: token }),
    getSubscribers: (token?: string | null) => apiFetch<any>('/admin/users/subscribers', { authToken: token }),
    getUserDetails: (token: string | null | undefined, clerkId: string) =>
      apiFetch<any>(`/admin/users/${encodeURIComponent(clerkId)}/details`, { authToken: token }),
    getAudits:   (token: string | null | undefined, params: Record<string, string>) =>
      apiFetch<any>(`/admin/audits?${new URLSearchParams(params)}`, { authToken: token }),
    getPerformance: (token?: string | null) => apiFetch<any>('/admin/performance', { authToken: token }),
    getRevenue:  (token?: string | null) => apiFetch<any>('/admin/revenue', { authToken: token }),
    getSystem:   (token?: string | null) => apiFetch<any>('/admin/system',  { authToken: token }),
    getNotifications: (token?: string | null) => apiFetch<any>('/admin/notifications', { authToken: token }),
    markAllRead: (token: string) =>
      apiFetch<any>('/admin/notifications/read-all', { method: 'POST', authToken: token }),
    updatePlan:  (token: string, clerkId: string, plan: string) =>
      apiFetch<any>(`/admin/users/${encodeURIComponent(clerkId)}/plan`, {
        method: 'PATCH', body: JSON.stringify({ plan }), authToken: token,
      }),
    banUser:     (token: string, clerkId: string) =>
      apiFetch<any>(`/admin/users/${encodeURIComponent(clerkId)}/ban`, { method: 'PATCH', authToken: token }),
    suspendUser: (token: string, clerkId: string) =>
      apiFetch<any>(`/admin/users/${encodeURIComponent(clerkId)}/suspend`, { method: 'PATCH', authToken: token }),
    unsuspendUser: (token: string, clerkId: string) =>
      apiFetch<any>(`/admin/users/${encodeURIComponent(clerkId)}/unsuspend`, { method: 'PATCH', authToken: token }),
    testEmail:   (token: string) =>
      apiFetch<any>('/admin/test-email', { method: 'POST', authToken: token }),
    clearCache:  (token: string) =>
      apiFetch<any>('/admin/clear-cache', { method: 'POST', authToken: token }),
    exportUsers:       (token: string | null | undefined) => downloadAdminExport('users', token),
    exportAudits:      (token: string | null | undefined) => downloadAdminExport('audits', token),
    exportPerformance: (token: string | null | undefined) => downloadAdminExport('performance', token),
    importProspects: (token: string | null | undefined, csv: string, locale: 'ar' | 'en' | 'fr') =>
      apiFetch<any>('/admin/prospects/import', { method: 'POST', body: JSON.stringify({ csv, locale }), authToken: token }),
    getProspects: (token: string | null | undefined, params: Record<string, string>) =>
      apiFetch<any>(`/admin/prospects?${new URLSearchParams(params)}`, { authToken: token }),
    exportProspects: (token: string | null | undefined, batch?: string) =>
      downloadAdminExport('prospects', token, `/admin/prospects/export${batch ? `?batch=${encodeURIComponent(batch)}` : ''}`),
  },
};
