import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ReportLocale } from '../i18n/report-texts';
import { ReportEmailData, renderReportEmail } from './report-email.template';
import { AlertEmailData, renderAlertEmail } from './alert-email.template';

export interface SendReportEmailDto extends ReportEmailData {
  toEmail: string;
  locale: ReportLocale;
}

@Injectable()
export class BrevoService {
  private readonly logger = new Logger(BrevoService.name);
  private readonly apiKey: string;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey    = this.config.get<string>('brevo.apiKey', '');
    this.fromEmail = this.config.get<string>('brevo.fromEmail', '');
    this.fromName  = this.config.get<string>('brevo.fromName', 'VELIFA');
  }

  async sendReportEmail(dto: SendReportEmailDto): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn('BREVO_API_KEY not set — skipping email');
      return;
    }

    const { subject, html } = renderReportEmail(dto, dto.locale);
    await this.send(dto.toEmail, subject, html);
    this.logger.log(`Report email sent (${dto.locale})`);
  }

  /** Alerte de baisse de score (audit programmé). */
  async sendAlertEmail(toEmail: string, locale: ReportLocale, data: AlertEmailData): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn('BREVO_API_KEY not set — skipping alert email');
      return;
    }
    const { subject, html } = renderAlertEmail(data, locale);
    await this.send(toEmail, subject, html);
    this.logger.log(`Alert email sent (${locale})`);
  }

  private async send(toEmail: string, subject: string, html: string): Promise<void> {
    try {
      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender:      { email: this.fromEmail, name: this.fromName },
          to:          [{ email: toEmail }],
          subject,
          htmlContent: html,
        },
        {
          headers: { 'api-key': this.apiKey, 'Content-Type': 'application/json' },
          timeout: 10_000,
        },
      );
    } catch (error: any) {
      const msg = error.response?.data?.message ?? error.message;
      this.logger.warn(`Email failed: ${msg}`);
      throw error;
    }
  }
}
