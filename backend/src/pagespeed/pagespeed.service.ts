import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AuditItem, ParsedLighthouse, parseLighthouse } from './lighthouse-parse';

export type PageSpeedStrategy = 'mobile' | 'desktop';

export interface CoreWebVitals {
  lcp: number | null;   // Largest Contentful Paint (ms)
  cls: number | null;   // Cumulative Layout Shift (score)
  tbt: number | null;   // Total Blocking Time (ms)
  fcp: number | null;   // First Contentful Paint (ms)
  ttfb: number | null;  // Time to First Byte (ms)
}

export interface PageSpeedResult extends ParsedLighthouse {
  strategy: PageSpeedStrategy;
  coreWebVitals: CoreWebVitals;
  rawJson: Record<string, unknown>;
}

export type { AuditItem };

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

  private parseResponse(data: any, strategy: PageSpeedStrategy): PageSpeedResult {
    return { strategy, ...parseLighthouse(data), rawJson: data };
  }
}
