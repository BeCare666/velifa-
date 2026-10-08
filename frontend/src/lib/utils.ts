import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function formatMs(ms: number | null | undefined): string {
  if (ms == null) return 'N/A';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}
export function getScoreColor(score: number | null | undefined): string {
  if (score == null) return 'text-gray-400';
  if (score >= 90) return 'text-green-600';
  if (score >= 50) return 'text-orange-500';
  return 'text-red-500';
}
export function getScoreBg(score: number | null | undefined): string {
  if (score == null) return 'bg-gray-100';
  if (score >= 90) return 'bg-green-50';
  if (score >= 50) return 'bg-orange-50';
  return 'bg-red-50';
}
export function getScoreLabel(score: number | null | undefined): string {
  if (score == null) return '—';
  if (score >= 90) return 'Excellent';
  if (score >= 50) return 'À améliorer';
  return 'Critique';
}
export function getCwvStatus(
  metric: 'lcp' | 'cls' | 'tbt' | 'fcp',
  value: number | null | undefined
): 'good' | 'needs-improvement' | 'poor' {
  if (value == null) return 'poor';
  const thresholds: Record<string, [number, number]> = {
    lcp: [2500, 4000], cls: [0.1, 0.25], tbt: [200, 600], fcp: [1800, 3000],
  };
  const [good, poor] = thresholds[metric];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes === 0) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
