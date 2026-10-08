export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type TechCategory   = 'E-commerce' | 'CMS' | 'Framework JS' | 'Analytics' | 'Serveur';
export type TechConfidence = 'high' | 'medium' | 'low';

export interface DetectedTech {
  name:       string;
  category:   TechCategory;
  confidence: TechConfidence;
  version?:   string;
}

export interface AuditItem {
  url?: string;
  title: string;
  description?: string;
  savingsBytes?: number;
  savingsMs?: number;
}

export type FieldCategory = 'FAST' | 'AVERAGE' | 'SLOW';
export interface FieldMetric { percentile: number; category: FieldCategory | null }

/** Données réelles des visiteurs Chrome (Chrome UX Report, 28 jours). */
export interface FieldData {
  scope: 'url' | 'origin';
  overall: FieldCategory | null;
  lcpMs: FieldMetric | null;
  inpMs: FieldMetric | null;
  cls: FieldMetric | null;
  fcpMs: FieldMetric | null;
  ttfbMs: FieldMetric | null;
}

export interface Recommendation {
  id: string;
  score: number;
  savingsMs: number;
  savingsCls: number;
  itemCount: number;
  impact: 'high' | 'medium' | 'low';
}

export interface SiteIssue { code: string; severity: 'high' | 'medium' | 'low' }

export interface SiteChecks {
  blocked: boolean;
  language: {
    htmlLang: string | null;
    dir: 'rtl' | 'ltr' | null;
    arabicRatio: number;
    hreflangs: string[];
    languageSwitchTargets: string[];
  };
  privacy: { trackers: string[]; consentTool: string | null; privacyPolicyLink: boolean };
  issues: SiteIssue[];
}

export interface Analysis {
  id: string;
  urlSite: string;
  status: AnalysisStatus;
  locale?: string;
  platform?: string | null;
  fieldData?: FieldData | null;
  recommendations?: Recommendation[] | null;
  siteChecks?: SiteChecks | null;
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
  screenshotUrl?: string | null;
  whatsappLink?: string | null;
  reportUrl?: string | null;
  imagesToOptimize?: AuditItem[] | null;
  blockingScripts?: AuditItem[] | null;
  unusedResources?: AuditItem[] | null;
  reportJson?: any | null;
  technologies?: DetectedTech[] | null;
  errorMessage?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface CreateAnalysisResponse {
  data: { id: string; status: AnalysisStatus; cached: boolean };
  timestamp: string;
}

export interface MyAudit {
  id: string;
  url: string;
  status: AnalysisStatus;
  scorePerformance: number | null;
  scoreAccessibility: number | null;
  scoreSeo: number | null;
  scoreBestPractices: number | null;
  createdAt: string;
  completedAt: string | null;
}

export interface SseEvent {
  status: AnalysisStatus;
  analysisId: string;
  redirectUrl?: string;
}
