import {
  Injectable, Logger, ForbiddenException, NotFoundException, ServiceUnavailableException, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DatabaseService } from '../prisma/database.service';
import { effectivePlan, PlanName } from '../payments/plan-limits';
import { toReportLocale, ReportLocale } from '../i18n/report-texts';
import { renderPdfReportHtml } from './pdf-report.template';

/** Export PDF à la marque de l'agence : plan Business (annoncé sur la page Tarifs). */
export function canExportPdf(plan: PlanName): boolean {
  return plan === 'business';
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(private readonly db: DatabaseService, private readonly config: ConfigService) {}

  /** Envoi du HTML à Browserless (remplaçable dans les tests). */
  renderPdf = async (html: string): Promise<Buffer> => {
    const token = this.config.get<string>('browserless.apiKey', '');
    if (!token) throw new ServiceUnavailableException('pdf_unavailable');
    const base = this.config.get<string>('browserless.url', 'https://chrome.browserless.io').replace(/\/+$/, '');
    const res = await axios.post(
      `${base}/pdf?token=${encodeURIComponent(token)}`,
      {
        html,
        options: { format: 'A4', printBackground: true, preferCSSPageSize: true },
        gotoOptions: { waitUntil: 'networkidle0', timeout: 20_000 },
      },
      { responseType: 'arraybuffer', timeout: 30_000 },
    );
    return Buffer.from(res.data);
  };

  /** PDF d'un audit terminé, à la marque d'un espace dont l'appelant est membre. */
  async generate(callerId: string | null, analysisId: string, workspaceId: string, locale?: string): Promise<{ pdf: Buffer; filename: string }> {
    if (!callerId) throw new UnauthorizedException('Valid Clerk token required');
    const workspace = workspaceId ? await this.db.findWorkspaceById(workspaceId) : null;
    const members = workspace ? await this.db.findWorkspaceMembers(workspaceId) : [];
    if (!workspace || !members.some((m) => m.clerkUserId === callerId)) throw new NotFoundException('Workspace not found');

    const owner = await this.db.findUserByClerkId(workspace.ownerClerkUserId);
    if (!canExportPdf(effectivePlan(owner?.subscriptionPlan, owner?.subscriptionStatus))) {
      throw new ForbiddenException('pdf_requires_business');
    }

    const analysis = await this.db.findAnalysisById(analysisId);
    if (!analysis || analysis.status !== 'completed') throw new NotFoundException('Analysis not found');

    const lang: ReportLocale = toReportLocale(locale ?? workspace.defaultLocale);
    const html = renderPdfReportHtml(analysis, workspace, lang);
    let pdf: Buffer;
    try {
      pdf = await this.renderPdf(html);
    } catch (err: any) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.error(`PDF ${analysisId} : ${err?.message}`);
      throw new ServiceUnavailableException('pdf_failed');
    }
    const host = (() => { try { return new URL(analysis.urlSite).hostname.replace(/^www\./, ''); } catch { return 'site'; } })();
    return { pdf, filename: `rapport-${host}-${lang}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_') };
  }
}
