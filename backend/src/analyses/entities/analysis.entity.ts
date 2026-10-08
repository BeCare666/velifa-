import { AnalysisStatus } from '@prisma/client';

export class AnalysisEntity {
  id!: string;
  urlSite!: string;
  email!: string;
  status!: AnalysisStatus;
  scorePerformance?: number | null;
  scoreAccessibility?: number | null;
  scoreSeo?: number | null;
  scoreBestPractices?: number | null;
  lcpMobile?: number | null;
  clsMobile?: number | null;
  tbtMobile?: number | null;
  fcpMobile?: number | null;
  ttfbMobile?: number | null;
  lcpDesktop?: number | null;
  clsDesktop?: number | null;
  tbtDesktop?: number | null;
  fcpDesktop?: number | null;
  ttfbDesktop?: number | null;
  imagesToOptimize?: unknown | null;
  blockingScripts?: unknown | null;
  unusedResources?: unknown | null;
  screenshotUrl?: string | null;
  whatsappLink?: string | null;
  reportUrl?: string | null;
  errorMessage?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  completedAt?: Date | null;
  failedAt?: Date | null;
}
