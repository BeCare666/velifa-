import type { Analysis, CreateAnalysisResponse, MyAudit } from '@/types/analysis';
import type { SubscriptionInfo } from '@/types/subscription';

const BASE_URL   = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const ADMIN_KEY  = process.env.NEXT_PUBLIC_ADMIN_API_KEY ?? 'velifa_admin_internal_2026';

interface ApiFetchOptions extends RequestInit {
  authToken?: string | null;
}

async function apiFetch<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options?.authToken) {
    headers['Authorization'] = `Bearer ${options.authToken}`;
  }
  const { authToken, ...rest } = options ?? {};
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { ...headers, ...rest?.headers },
    ...rest,
  });
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
    url: string; email?: string; cfTurnstileToken: string; locale?: string; force?: boolean;
  }, authToken?: string | null) =>
    apiFetch<CreateAnalysisResponse>('/analyses', {
      method: 'POST',
      body: JSON.stringify(body),
      authToken,
    }),

  getAnalysis: (id: string) => apiFetch<{ data: Analysis }>(`/analyses/${id}`),

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

  sendReportEmail: (id: string, email: string) =>
    apiFetch<{ data: { sent: boolean } }>(`/analyses/${id}/send-email`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // ── Admin ──────────────────────────────────────────────────────────────────
  admin: {
    getStats:    (token?: string | null) => apiFetch<any>('/admin/stats',    { authToken: token || ADMIN_KEY }),
    getActivity: (token?: string | null) => apiFetch<any>('/admin/activity', { authToken: token || ADMIN_KEY }),
    getUsers:    (token: string | null | undefined, params: Record<string, string>) =>
      apiFetch<any>(`/admin/users?${new URLSearchParams(params)}`, { authToken: token || ADMIN_KEY }),
    getSubscribers: (token?: string | null) => apiFetch<any>('/admin/users/subscribers', { authToken: token || ADMIN_KEY }),
    getUserDetails: (token: string | null | undefined, clerkId: string) =>
      apiFetch<any>(`/admin/users/${clerkId}/details`, { authToken: token || ADMIN_KEY }),
    getAudits:   (token: string | null | undefined, params: Record<string, string>) =>
      apiFetch<any>(`/admin/audits?${new URLSearchParams(params)}`, { authToken: token || ADMIN_KEY }),
    getPerformance: (token?: string | null) => apiFetch<any>('/admin/performance', { authToken: token || ADMIN_KEY }),
    getRevenue:  (token?: string | null) => apiFetch<any>('/admin/revenue', { authToken: token || ADMIN_KEY }),
    getSystem:   (token?: string | null) => apiFetch<any>('/admin/system',  { authToken: token || ADMIN_KEY }),
    getNotifications: (token?: string | null) => apiFetch<any>('/admin/notifications', { authToken: token || ADMIN_KEY }),
    markAllRead: (token: string) =>
      apiFetch<any>('/admin/notifications/read-all', { method: 'POST', authToken: token }),
    updatePlan:  (token: string, clerkId: string, plan: string) =>
      apiFetch<any>(`/admin/users/${clerkId}/plan`, {
        method: 'PATCH', body: JSON.stringify({ plan }), authToken: token,
      }),
    banUser:     (token: string, clerkId: string) =>
      apiFetch<any>(`/admin/users/${clerkId}/ban`, { method: 'PATCH', authToken: token }),
    suspendUser: (token: string, clerkId: string) =>
      apiFetch<any>(`/admin/users/${clerkId}/suspend`, { method: 'PATCH', authToken: token }),
    unsuspendUser: (token: string, clerkId: string) =>
      apiFetch<any>(`/admin/users/${clerkId}/unsuspend`, { method: 'PATCH', authToken: token }),
    testEmail:   (token: string) =>
      apiFetch<any>('/admin/test-email', { method: 'POST', authToken: token }),
    clearCache:  (token: string) =>
      apiFetch<any>('/admin/clear-cache', { method: 'POST', authToken: token }),
    exportUsers:       () => `${BASE_URL}/admin/export/users?key=${ADMIN_KEY}`,
    exportAudits:      () => `${BASE_URL}/admin/export/audits?key=${ADMIN_KEY}`,
    exportPerformance: () => `${BASE_URL}/admin/export/performance?key=${ADMIN_KEY}`,
  },
};
