import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SendReportEmailDto {
  toEmail: string;
  urlSite: string;
  scorePerformance: number;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  reportUrl: string;
  whatsappUrl: string;
  screenshotUrl?: string | null;
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

    const scoreLabel = this.getScoreLabel(dto.scorePerformance);
    const scoreColor = this.getScoreColor(dto.scorePerformance);
    const scoreHex   = this.getScoreHex(dto.scorePerformance);
    const lcpStr = dto.lcp != null ? `${(dto.lcp / 1000).toFixed(1)}s` : 'N/A';
    const clsStr = dto.cls != null ? dto.cls.toFixed(3) : 'N/A';
    const tbtStr = dto.tbt != null ? `${Math.round(dto.tbt)}ms` : 'N/A';

    const htmlContent = this.buildHtmlEmail({
      urlSite:       dto.urlSite,
      scoreGlobal:   dto.scorePerformance,
      scoreLabel,
      scoreColor,
      scoreHex,
      lcp:           lcpStr,
      cls:           clsStr,
      tbt:           tbtStr,
      reportUrl:     dto.reportUrl,
      whatsappUrl:   dto.whatsappUrl,
      screenshotUrl:  dto.screenshotUrl ?? null,
    });

    this.logger.debug(`[BrevoService] Generated HTML email — length=${htmlContent.length}`);
    this.logger.debug(`[BrevoService] HTML preview (first 2000 chars):\n${htmlContent.substring(0, 2000)}`);

    try {
      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender:     { email: this.fromEmail, name: this.fromName },
          to:         [{ email: dto.toEmail }],
          subject:    'Votre rapport de performance VELIFA',
          htmlContent,
        },
        {
          headers: {
            'api-key':      this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10_000,
        },
      );
      this.logger.log(`Email sent to ${dto.toEmail}`);
    } catch (error: any) {
      const msg = error.response?.data?.message ?? error.message;
      this.logger.warn(`Email failed (non-blocking): ${msg}`);
      throw error;
    }
  }

  private getScoreLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 50) return 'À améliorer';
    return 'Critique';
  }

  private getScoreColor(score: number): string {
    if (score >= 90) return 'green';
    if (score >= 50) return 'orange';
    return 'red';
  }

  private getScoreHex(score: number): string {
    if (score >= 90) return '#0CCE6B';
    if (score >= 50) return '#FFA400';
    return '#FF4E42';
  }

  private buildHtmlEmail(data: {
    urlSite: string; scoreGlobal: number; scoreLabel: string;
    scoreColor: string; scoreHex: string; lcp: string;
    cls: string; tbt: string; reportUrl: string;
    whatsappUrl: string; screenshotUrl: string | null;
  }): string {
    const gold1   = '#F4D88A';
    const gold2   = '#D4AF37';
    const gold3   = '#A87B1E';
    const bg      = '#0A0A0A';
    const card    = '#1A1A1A';
    const cardAlt = '#141414';
    const border  = '#2E2E2E';
    const text    = '#FFFFFF';
    const sub     = '#9A9A9A';
    const dimmed  = '#555555';

    const btnCTA = `display: inline-block; padding: 14px 36px; border-radius: 4px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: bold; color: #0A0A0A; text-decoration: none; text-align: center; background: linear-gradient(135deg, ${gold1} 0%, ${gold2} 50%, ${gold3} 100%);`;

    const btnSecondary = `display: inline-block; padding: 11px 28px; border-radius: 4px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: ${gold2}; text-decoration: none; text-align: center; border: 1px solid ${gold2};`;

    const screenshotBlock = data.screenshotUrl
      ? `<tr>
    <td style="padding: 24px 0 0 0; text-align: center;">
      <p style="margin: 0 0 12px 0; font-size: 12px; color: ${sub}; letter-spacing: 1px; text-transform: uppercase;">
        <img src="https://img.icons8.com/color/20/camera.png" width="14" height="14" alt="" style="vertical-align: middle; border: 0; display: inline-block; margin-right: 6px;" />&nbsp;Aperçu de votre site
      </p>
      <img src="${data.screenshotUrl}" alt="Capture d'écran"
           width="560"
           style="border-radius: 8px; border: 1px solid ${border}; max-width: 100%; height: auto; display: block; margin: 0 auto;" />
    </td>
  </tr>`
      : '';

    const year = new Date().getFullYear();

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Rapport de performance VELIFA</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${bg}; font-family: Arial, Helvetica, sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${bg};">
<tr>
<td align="center" style="padding: 40px 16px 40px 16px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">

  <!-- ── EN-TÊTE ──────────────────────────────────────────── -->
  <tr>
    <td style="background-color: ${card}; border: 1px solid ${border}; border-radius: 10px; padding: 36px 32px 28px 32px; text-align: center;">
      <p style="margin: 0 0 6px 0; font-size: 30px; font-weight: bold; letter-spacing: 5px; color: ${gold2};">VELIFA</p>
      <p style="margin: 0; font-size: 12px; color: ${sub}; letter-spacing: 2px; text-transform: uppercase;">Performance Beyond Limits</p>
    </td>
  </tr>

  <!-- ── SALUTATION + URL ────────────────────────────────── -->
  <tr>
    <td style="padding: 28px 0 0 0; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: ${sub};">Votre rapport de performance pour</p>
      <p style="margin: 8px 0 0 0; font-size: 15px; color: ${text}; font-weight: bold; word-break: break-all;">${data.urlSite}</p>
    </td>
  </tr>

  <!-- ── SÉPARATEUR ─────────────────────────────────────── -->
  <tr>
    <td style="padding: 20px 0 0 0; text-align: center;">
      <div style="height: 1px; background: linear-gradient(90deg, transparent, ${border}, transparent);"></div>
    </td>
  </tr>

  <!-- ── SCORE GLOBAL ───────────────────────────────────── -->
  <tr>
    <td style="padding: 28px 0 0 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background-color: ${card}; border: 1px solid ${border}; border-radius: 10px; padding: 36px 32px; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 12px; color: ${sub}; letter-spacing: 2px; text-transform: uppercase;">
              <img src="https://img.icons8.com/color/20/goal--v1.png" width="16" height="16" alt="" style="vertical-align: middle; border: 0; display: inline-block; margin-right: 6px;" />&nbsp;Score global
            </p>
            <p style="margin: 0 0 8px 0; font-size: 76px; font-weight: bold; line-height: 1; color: ${data.scoreHex};">${data.scoreGlobal}</p>
            <p style="margin: 0; font-size: 15px; font-weight: bold; color: ${data.scoreHex};">${data.scoreLabel}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ── CORE WEB VITALS ─────────────────────────────────── -->
  <tr>
    <td style="padding: 20px 0 0 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${card}; border: 1px solid ${border}; border-radius: 10px; overflow: hidden;">
        <!-- header row -->
        <tr>
          <td colspan="3" style="padding: 16px 20px 14px 20px; border-bottom: 1px solid ${border};">
            <p style="margin: 0; font-size: 12px; color: ${sub}; letter-spacing: 2px; text-transform: uppercase; text-align: center;">
              <img src="https://img.icons8.com/color/20/combo-chart--v1.png" width="16" height="16" alt="" style="vertical-align: middle; border: 0; display: inline-block; margin-right: 6px;" />&nbsp;Core Web Vitals
            </p>
          </td>
        </tr>
        <!-- data row -->
        <tr>
          <!-- LCP -->
          <td width="33%" style="padding: 22px 8px 20px 8px; text-align: center; border-right: 1px solid ${border};">
            <p style="margin: 0 0 6px 0; font-size: 10px; color: ${sub}; letter-spacing: 1px; text-transform: uppercase;"><img src="https://img.icons8.com/color/16/flash-on.png" width="12" height="12" alt="" style="vertical-align: middle; border: 0; display: inline-block; margin-right: 4px;" /> LCP</p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${text};">${data.lcp}</p>
            <p style="margin: 6px 0 0 0; font-size: 10px; color: ${dimmed};">Chargement</p>
          </td>
          <!-- CLS -->
          <td width="33%" style="padding: 22px 8px 20px 8px; text-align: center; border-right: 1px solid ${border};">
            <p style="margin: 0 0 6px 0; font-size: 10px; color: ${sub}; letter-spacing: 1px; text-transform: uppercase;"><img src="https://img.icons8.com/color/16/resize-four-directions.png" width="12" height="12" alt="" style="vertical-align: middle; border: 0; display: inline-block; margin-right: 4px;" /> CLS</p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${text};">${data.cls}</p>
            <p style="margin: 6px 0 0 0; font-size: 10px; color: ${dimmed};">Stabilité visuelle</p>
          </td>
          <!-- TBT -->
          <td width="34%" style="padding: 22px 8px 20px 8px; text-align: center;">
            <p style="margin: 0 0 6px 0; font-size: 10px; color: ${sub}; letter-spacing: 1px; text-transform: uppercase;"><img src="https://img.icons8.com/color/16/stopwatch.png" width="12" height="12" alt="" style="vertical-align: middle; border: 0; display: inline-block; margin-right: 4px;" /> TBT</p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${text};">${data.tbt}</p>
            <p style="margin: 6px 0 0 0; font-size: 10px; color: ${dimmed};">Temps bloquant</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ── SCREENSHOT ─────────────────────────────────────── -->
  ${screenshotBlock}

  <!-- ── BOUTONS ────────────────────────────────────────── -->
  <tr>
    <td style="padding: 32px 0 0 0; text-align: center;">
      <a href="${data.reportUrl}" style="${btnCTA}">⚡ &nbsp;Voir le rapport complet</a>
    </td>
  </tr>
  <tr>
    <td style="padding: 12px 0 0 0; text-align: center;">
      <a href="${data.whatsappUrl}" style="${btnSecondary}">Obtenir de l'aide via WhatsApp</a>
    </td>
  </tr>

  <!-- ── SÉPARATEUR ─────────────────────────────────────── -->
  <tr>
    <td style="padding: 36px 0 0 0; text-align: center;">
      <div style="height: 1px; background: linear-gradient(90deg, transparent, ${border}, transparent);"></div>
    </td>
  </tr>

  <!-- ── SIGNATURE SOCIAL ────────────────────────────────── -->
  <!--
    PNG colorés https:// via img.icons8.com — couleurs officielles de chaque marque.
    Reconnaissables immédiatement. Compatible Gmail + Outlook + Apple Mail.
    Table HTML pour centrage cross-client.
  -->
  <tr>
    <td style="padding: 28px 0 0 0; text-align: center;">
      <p style="margin: 0 0 20px 0; font-size: 12px; color: ${sub}; letter-spacing: 2px; text-transform: uppercase;">
        Suivez Velifa
      </p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
        <tr>

          <!-- X / Twitter — noir officiel -->
          <td style="padding: 0 6px;" align="center">
            <a href="https://twitter.com/velifa_io" target="_blank" rel="noopener noreferrer"
               style="display: inline-block; text-decoration: none;">
              <img src="https://img.icons8.com/color/48/twitterx--v2.png"
                   width="40" height="40" alt="X (Twitter)"
                   style="display: block; border: 0;" />
            </a>
            <p style="margin: 6px 0 0 0; font-size: 10px; color: ${sub};">X</p>
          </td>

          <!-- LinkedIn — bleu #0A66C2 -->
          <td style="padding: 0 6px;" align="center">
            <a href="https://linkedin.com/company/velifa" target="_blank" rel="noopener noreferrer"
               style="display: inline-block; text-decoration: none;">
              <img src="https://img.icons8.com/color/48/linkedin.png"
                   width="40" height="40" alt="LinkedIn"
                   style="display: block; border: 0;" />
            </a>
            <p style="margin: 6px 0 0 0; font-size: 10px; color: ${sub};">LinkedIn</p>
          </td>

          <!-- Facebook — bleu #1877F2 -->
          <td style="padding: 0 6px;" align="center">
            <a href="https://facebook.com/velifa.io" target="_blank" rel="noopener noreferrer"
               style="display: inline-block; text-decoration: none;">
              <img src="https://img.icons8.com/color/48/facebook-new.png"
                   width="40" height="40" alt="Facebook"
                   style="display: block; border: 0;" />
            </a>
            <p style="margin: 6px 0 0 0; font-size: 10px; color: ${sub};">Facebook</p>
          </td>

          <!-- Instagram — dégradé officiel -->
          <td style="padding: 0 6px;" align="center">
            <a href="https://instagram.com/velifa_io" target="_blank" rel="noopener noreferrer"
               style="display: inline-block; text-decoration: none;">
              <img src="https://img.icons8.com/color/48/instagram-new--v1.png"
                   width="40" height="40" alt="Instagram"
                   style="display: block; border: 0;" />
            </a>
            <p style="margin: 6px 0 0 0; font-size: 10px; color: ${sub};">Instagram</p>
          </td>

        </tr>
      </table>
    </td>
  </tr>

  <!-- ── PIED DE PAGE ────────────────────────────────────── -->
  <tr>
    <td style="padding: 28px 0 0 0; text-align: center;">
      <p style="margin: 0; font-size: 11px; color: ${dimmed};">
        © ${year} Velifa &nbsp;·&nbsp; Performance Beyond Limits
      </p>
      <p style="margin: 6px 0 0 0; font-size: 10px; color: #444444;">
        Vous recevez cet email car vous avez demandé un audit de performance.
      </p>
    </td>
  </tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;
  }
}
