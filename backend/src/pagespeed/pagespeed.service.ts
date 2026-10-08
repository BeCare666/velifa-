import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export type PageSpeedStrategy = 'mobile' | 'desktop';

export interface CoreWebVitals {
  lcp: number | null;   // Largest Contentful Paint (ms)
  cls: number | null;   // Cumulative Layout Shift (score)
  tbt: number | null;   // Total Blocking Time (ms)
  fcp: number | null;   // First Contentful Paint (ms)
  ttfb: number | null;  // Time to First Byte (ms)
}

export interface PageSpeedResult {
  strategy: PageSpeedStrategy;
  scorePerformance: number;
  scoreAccessibility: number;
  scoreSeo: number;
  scoreBestPractices: number;
  coreWebVitals: CoreWebVitals;
  imagesToOptimize: AuditItem[];
  blockingScripts: AuditItem[];
  unusedResources: AuditItem[];
  rawJson: Record<string, unknown>;
}

export interface AuditItem {
  url?: string;
  title: string;
  description?: string;
  savingsBytes?: number;
  savingsMs?: number;
}

const PAGESPEED_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const CATEGORIES = ['PERFORMANCE', 'ACCESSIBILITY', 'SEO', 'BEST_PRACTICES'];
const TIMEOUT_MS = 30_000;

const paramsSerializer = (p: Record<string, any>) =>
  Object.entries(p)
    .flatMap(([k, v]) =>
      Array.isArray(v) ? v.map((item: string) => `${encodeURIComponent(k)}=${encodeURIComponent(item)}`) : [`${encodeURIComponent(k)}=${encodeURIComponent(v)}`]
    )
    .join('&');

@Injectable()
export class PageSpeedService {
  private readonly logger = new Logger(PageSpeedService.name);
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('pagespeed.apiKey', '');
    if (!this.apiKey) {
      this.logger.warn('PAGESPEED_API_KEY is not set — PageSpeed API calls will fail with quota exceeded');
    }
  }

  async analyze(url: string, strategy: PageSpeedStrategy): Promise<PageSpeedResult> {
    this.logger.log(`Analyzing ${url} [${strategy}]`);
    const start = Date.now();

    try {
      const params: Record<string, any> = {
        url,
        strategy: strategy.toUpperCase(),
        key: this.apiKey,
        category: CATEGORIES,
      };

      const { data } = await axios.get(PAGESPEED_API, {
        params,
        paramsSerializer,
        timeout: TIMEOUT_MS,
      });

      const result = this.parseResponse(data, strategy);
      this.logger.log(
        `PageSpeed [${strategy}] done in ${Date.now() - start}ms — score: ${result.scorePerformance}`,
      );
      return result;
    } catch (error: any) {
      const msg = error.response?.data?.error?.message ?? error.message;
      this.logger.error(`PageSpeed [${strategy}] failed: ${msg}`);
      throw new HttpException(
        `PageSpeed API error: ${msg}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private parseResponse(
    data: any,
    strategy: PageSpeedStrategy,
  ): PageSpeedResult {
    const cats = data.lighthouseResult?.categories ?? {};
    const audits = data.lighthouseResult?.audits ?? {};

    return {
      strategy,
      scorePerformance:   this.toScore(cats.performance?.score),
      scoreAccessibility: this.toScore(cats.accessibility?.score),
      scoreSeo:           this.toScore(cats.seo?.score),
      scoreBestPractices: this.toScore(cats['best-practices']?.score),
      coreWebVitals: {
        lcp:  this.toMs(audits['largest-contentful-paint']?.numericValue),
        cls:  audits['cumulative-layout-shift']?.numericValue ?? null,
        tbt:  this.toMs(audits['total-blocking-time']?.numericValue),
        fcp:  this.toMs(audits['first-contentful-paint']?.numericValue),
        ttfb: this.toMs(audits['server-response-time']?.numericValue),
      },
      imagesToOptimize:  this.parseAuditItems(audits['uses-optimized-images']),
      blockingScripts:   this.parseAuditItems(audits['render-blocking-resources']),
      unusedResources:   this.parseAuditItems(audits['unused-javascript']),
      rawJson: data,
    };
  }

  private toScore(raw: number | null | undefined): number {
    if (raw == null) return 0;
    return Math.round(raw * 100);
  }

  private toMs(raw: number | null | undefined): number | null {
    if (raw == null) return null;
    return Math.round(raw);
  }

  private parseAuditItems(audit: any): AuditItem[] {
    if (!audit?.details?.items) return [];
    return (audit.details.items as any[]).slice(0, 10).map((item) => ({
      url:          item.url ?? item.label ?? '',
      title:        audit.title ?? '',
      description:  audit.description ?? '',
      savingsBytes: item.totalBytes ?? item.wastedBytes ?? undefined,
      savingsMs:    item.wastedMs ?? undefined,
    }));
  }
}
