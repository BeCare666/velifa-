import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import { ConfigService } from '@nestjs/config';
import { loadMigrations, runMigrations } from './migrator';

export interface Analysis {
  id: string;
  urlSite: string;
  urlHash: string;
  email: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scorePerformance: number | null;
  scoreAccessibility: number | null;
  scoreSeo: number | null;
  scoreBestPractices: number | null;
  lcpMobile: number | null;
  clsMobile: number | null;
  tbtMobile: number | null;
  fcpMobile: number | null;
  ttfbMobile: number | null;
  lcpDesktop: number | null;
  clsDesktop: number | null;
  tbtDesktop: number | null;
  fcpDesktop: number | null;
  ttfbDesktop: number | null;
  imagesToOptimize: any;
  blockingScripts: any;
  unusedResources: any;
  reportJson: any;
  technologies: any | null;
  /** Plateforme e-commerce détectée (Salla, Zid, Shopify…) */
  platform: string | null;
  /** Données réelles des visiteurs (CrUX) */
  fieldData: any | null;
  /** Recommandations priorisées (ids d'audits Lighthouse) */
  recommendations: any | null;
  /** Contrôles langue / confidentialité */
  siteChecks: any | null;
  screenshotUrl: string | null;
  cloudinaryPublicId: string | null;
  whatsappLink: string | null;
  reportUrl: string | null;
  locale: string;
  source: string;
  clerkUserId: string | null;  // Clerk user ID when authenticated (NULL for anonymous audits)
  ipAddress: string | null;
  userAgent: string | null;
  deletedAt: Date | null;
  anonymizedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  failedAt: Date | null;
}

export interface ProspectWithAudit {
  id: string;
  batchId: string;
  urlSite: string;
  name: string | null;
  phone: string | null;
  country: string | null;
  locale: string;
  analysisId: string | null;
  createdAt: Date;
  status: Analysis['status'] | null;
  scorePerformance: number | null;
  platform: string | null;
  siteChecks: any | null;
  reportUrl: string | null;
  errorMessage: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  logoUrl: string | null;
  brandColor: string;
  defaultLocale: string;
  ownerClerkUserId: string;
  createdAt: Date;
}

export interface WorkspaceMember {
  clerkUserId: string;
  role: 'owner' | 'member';
  createdAt: Date;
}

export interface TrackedSite {
  id: string;
  scope: string;
  workspaceId: string | null;
  ownerClerkUserId: string;
  urlSite: string;
  urlHash: string;
  label: string | null;
  createdBy: string;
  createdAt: Date;
  schedule?: string;
  alertThreshold?: number | null;
  locale?: string;
  lastScheduledAt?: Date | null;
  lastScore?: number | null;
  lastAnalysisId?: string | null;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool!: mysql.Pool;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const databaseUrl = this.config.get<string>('database.url', '');
    this.pool = mysql.createPool({
      uri: databaseUrl,
      ssl: { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: 10,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
    this.logger.log('Database connection pool initialized');
    await this.runMigrations();
  }

  /**
   * Migrations SQL versionnées (`backend/migrations`, voir `migrator.ts`).
   * Production : un échec arrête le démarrage (mieux qu'une application sur un schéma incomplet).
   * Développement : erreur journalisée, l'API démarre quand même (ex. base absente en local).
   */
  private async runMigrations(): Promise<void> {
    try {
      const report = await runMigrations(
        async (sql, params) => (await this.pool.query(sql, params))[0] as any[],
        loadMigrations(),
        (msg) => this.logger.log(msg),
      );
      this.logger.log(`Migrations : ${report.applied.length} appliquée(s), ${report.alreadyApplied.length} déjà en place`);
    } catch (err: any) {
      this.logger.error(`Migrations échouées : ${err?.message}`);
      if (this.config.get<string>('nodeEnv') === 'production') throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private rowToAnalysis(row: any): Analysis {
    if (!row) return null as any;
    return {
      id:                  row.id,
      urlSite:             row.url_site,
      urlHash:             row.url_hash,
      email:               row.email_client,
      status:              row.status,
      scorePerformance:    row.score_performance,
      scoreAccessibility:  row.score_accessibility,
      scoreSeo:            row.score_seo,
      scoreBestPractices:   row.score_best_practices,
      lcpMobile:           row.lcp_mobile,
      clsMobile:           row.cls_mobile,
      tbtMobile:           row.tbt_mobile,
      fcpMobile:           row.fcp_mobile,
      ttfbMobile:          row.ttfb_mobile,
      lcpDesktop:          row.lcp_desktop,
      clsDesktop:          row.cls_desktop,
      tbtDesktop:          row.tbt_desktop,
      fcpDesktop:          row.fcp_desktop,
      ttfbDesktop:         row.ttfb_desktop,
      imagesToOptimize:    this.parseJson(row.images_to_optimize),
      blockingScripts:     this.parseJson(row.blocking_scripts),
      unusedResources:     this.parseJson(row.unused_resources),
      reportJson:          this.parseJson(row.report_json),
      technologies:        this.parseJson(row.technologies),
      platform:            row.platform ?? null,
      fieldData:           this.parseJson(row.field_data),
      recommendations:     this.parseJson(row.recommendations),
      siteChecks:          this.parseJson(row.site_checks),
      screenshotUrl:       row.screenshot_url,
      cloudinaryPublicId:  row.cloudinary_public_id,
      whatsappLink:        row.whatsapp_link,
      reportUrl:           row.report_url,
      locale:              row.locale,
      source:              row.source,
      clerkUserId:         row.clerk_user_id ?? null,
      ipAddress:           row.ip_address,
      userAgent:           row.user_agent,
      deletedAt:           row.deleted_at,
      anonymizedAt:        row.anonymized_at,
      errorMessage:        row.error_message,
      createdAt:           row.created_at,
      updatedAt:           row.updated_at,
      completedAt:         row.completed_at,
      failedAt:            row.failed_at,
    };
  }

  private parseJson(value: any): any {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      try { return JSON.parse(value); } catch { return null; }
    }
    return value;
  }

  async createAnalysis(data: {
    urlSite: string;
    urlHash: string;
    email: string;
    locale: string;
    source: string;
    clerkUserId?: string | null;
    ipAddress: string | null;
  }): Promise<Analysis> {
    const id = this.generateId();
    await this.pool.query(
      `INSERT INTO analyses (id, url_site, url_hash, email_client, status, locale, source, clerk_user_id, ip_address, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, NOW(), NOW())`,
      [id, data.urlSite, data.urlHash, data.email, data.locale, data.source, data.clerkUserId ?? null, data.ipAddress],
    );
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM analyses WHERE id = ?',
      [id],
    );
    return this.rowToAnalysis(rows[0]);
  }

  async findAnalysisById(id: string): Promise<Analysis | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM analyses WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
    return rows[0] ? this.rowToAnalysis(rows[0]) : null;
  }

  async updateAnalysis(id: string, data: Record<string, any>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    const columnMap: Record<string, string> = {
      urlSite: 'url_site', urlHash: 'url_hash', email: 'email_client', status: 'status',
      scorePerformance: 'score_performance', scoreAccessibility: 'score_accessibility',
      scoreSeo: 'score_seo', scoreBestPractices: 'score_best_practices',
      lcpMobile: 'lcp_mobile', clsMobile: 'cls_mobile', tbtMobile: 'tbt_mobile',
      fcpMobile: 'fcp_mobile', ttfbMobile: 'ttfb_mobile',
      lcpDesktop: 'lcp_desktop', clsDesktop: 'cls_desktop', tbtDesktop: 'tbt_desktop',
      fcpDesktop: 'fcp_desktop', ttfbDesktop: 'ttfb_desktop',
      imagesToOptimize: 'images_to_optimize', blockingScripts: 'blocking_scripts',
      unusedResources: 'unused_resources', reportJson: 'report_json',
      technologies: 'technologies', platform: 'platform', fieldData: 'field_data',
      recommendations: 'recommendations', siteChecks: 'site_checks',
      screenshotUrl: 'screenshot_url', cloudinaryPublicId: 'cloudinary_public_id',
      whatsappLink: 'whatsapp_link', reportUrl: 'report_url',
      locale: 'locale', source: 'source', clerkUserId: 'clerk_user_id', ipAddress: 'ip_address',
      userAgent: 'user_agent', deletedAt: 'deleted_at', anonymizedAt: 'anonymized_at',
      errorMessage: 'error_message',
      completedAt: 'completed_at', failedAt: 'failed_at',
    };

    for (const [key, value] of Object.entries(data)) {
      if (columnMap[key] && value !== undefined) {
        fields.push(`${columnMap[key]} = ?`);
        let dbValue: any;
        if (value instanceof Date) {
          dbValue = value.toISOString().slice(0, 19).replace('T', ' ');
        } else if (typeof value === 'object' && value !== null) {
          dbValue = JSON.stringify(value);
        } else {
          dbValue = value;
        }
        values.push(dbValue);
      }
    }

    if (fields.length === 0) return;
    fields.push('updated_at = NOW()');
    values.push(id);

    await this.pool.query(
      `UPDATE analyses SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
  }

  async findAnalysesByUser(clerkUserId: string): Promise<Analysis[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT * FROM analyses WHERE clerk_user_id = ? AND status = 'completed' AND deleted_at IS NULL ORDER BY created_at DESC`,
      [clerkUserId],
    );
    return rows.map((row) => this.rowToAnalysis(row));
  }

  /** Dernier audit récent de cette URL pour le même propriétaire (ou anonyme ↔ anonyme). */
  async findCachedAnalysis(urlHash: string, cutoff: Date, clerkUserId: string | null): Promise<Analysis | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT * FROM analyses WHERE url_hash = ? AND status = 'completed' AND created_at >= ? AND deleted_at IS NULL
         AND clerk_user_id <=> ?
       ORDER BY created_at DESC LIMIT 1`,
      [urlHash, cutoff, clerkUserId],
    );
    return rows[0] ? this.rowToAnalysis(rows[0]) : null;
  }

  // ── Rate-limit counters ───────────────────────────────────────────────

  async countRecentAnalysesByUser(clerkUserId: string, cutoff: Date): Promise<number> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM analyses
       WHERE clerk_user_id = ? AND created_at >= ? AND deleted_at IS NULL`,
      [clerkUserId, cutoff],
    );
    return Number(rows[0]?.cnt ?? 0);
  }

  async isUserSuspended(clerkUserId: string): Promise<boolean> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT suspended FROM users WHERE clerk_user_id = ? LIMIT 1`,
      [clerkUserId],
    );
    return rows[0]?.suspended === 1 || rows[0]?.suspended === true;
  }

  async countRecentAnalysesByIp(ipAddress: string, cutoff: Date): Promise<number> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM analyses
       WHERE ip_address LIKE ? AND created_at >= ? AND deleted_at IS NULL`,
      [`${ipAddress.replace(/\.xxx$/, '')}%`, cutoff],
    );
    return Number(rows[0]?.cnt ?? 0);
  }

  // ── Users / subscriptions ──────────────────────────────────────────────

  async upsertUser(data: {
    clerkUserId: string;
    subscriptionPlan: 'pro' | 'business' | null;
    subscriptionStatus: string;
    lemonSubscriptionId: string;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO users (id, clerk_user_id, subscription_plan, subscription_status, lemon_subscription_id)
       VALUES (UUID(), ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         subscription_plan    = VALUES(subscription_plan),
         subscription_status  = VALUES(subscription_status),
         lemon_subscription_id = VALUES(lemon_subscription_id),
         updated_at           = NOW()`,
      [
        data.clerkUserId,
        data.subscriptionPlan,
        data.subscriptionStatus,
        data.lemonSubscriptionId,
      ],
    );
  }

  async findUserByClerkId(clerkUserId: string): Promise<{
    subscriptionPlan:    string | null;
    subscriptionStatus:  string | null;
    lemonSubscriptionId: string | null;
  } | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT subscription_plan, subscription_status, lemon_subscription_id
       FROM users WHERE clerk_user_id = ? LIMIT 1`,
      [clerkUserId],
    );
    if (!rows[0]) return null;
    return {
      subscriptionPlan:    rows[0].subscription_plan    ?? null,
      subscriptionStatus:  rows[0].subscription_status  ?? null,
      lemonSubscriptionId: rows[0].lemon_subscription_id ?? null,
    };
  }

  // ── Prospects (audit en lot) ───────────────────────────────────────────

  /** Parmi ces empreintes d'URL, celles déjà importées comme prospects. */
  async findExistingProspectHashes(urlHashes: string[]): Promise<Set<string>> {
    if (!urlHashes.length) return new Set();
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT url_hash FROM prospects WHERE url_hash IN (?)',
      [urlHashes],
    );
    return new Set(rows.map((r) => r.url_hash as string));
  }

  async insertProspect(p: {
    id: string; batchId: string; urlSite: string; urlHash: string; name: string | null;
    phone: string | null; country: string | null; locale: string; analysisId: string;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO prospects (id, batch_id, url_site, url_hash, name, phone, country, locale, analysis_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.batchId, p.urlSite, p.urlHash, p.name, p.phone, p.country, p.locale, p.analysisId],
    );
  }

  /** Prospects avec l'état et les résultats de leur audit (plus récents d'abord). */
  async listProspects(opts: { batchId?: string; limit: number; offset: number }): Promise<{ rows: ProspectWithAudit[]; total: number }> {
    const where = opts.batchId ? 'WHERE p.batch_id = ?' : '';
    const params: any[] = opts.batchId ? [opts.batchId] : [];
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT p.*, a.status, a.score_performance, a.platform, a.site_checks, a.report_url, a.error_message
         FROM prospects p LEFT JOIN analyses a ON a.id = p.analysis_id
         ${where}
        ORDER BY p.created_at DESC, p.id
        LIMIT ? OFFSET ?`,
      [...params, opts.limit, opts.offset],
    );
    const [[count]] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM prospects p ${where}`,
      params,
    );
    return {
      total: Number(count?.cnt ?? 0),
      rows: rows.map((r) => ({
        id:               r.id,
        batchId:          r.batch_id,
        urlSite:          r.url_site,
        name:             r.name ?? null,
        phone:            r.phone ?? null,
        country:          r.country ?? null,
        locale:           r.locale,
        analysisId:       r.analysis_id ?? null,
        createdAt:        r.created_at,
        status:           r.status ?? null,
        scorePerformance: r.score_performance ?? null,
        platform:         r.platform ?? null,
        siteChecks:       this.parseJson(r.site_checks),
        reportUrl:        r.report_url ?? null,
        errorMessage:     r.error_message ?? null,
      })),
    };
  }

  // ── Leads (« Je veux corriger ») ───────────────────────────────────────

  /** Même contact déjà enregistré pour ce rapport depuis `since` (évite les doublons). */
  async hasRecentLead(analysisId: string, email: string | null, phone: string | null, since: Date): Promise<boolean> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT 1 FROM leads
        WHERE analysis_id = ? AND created_at >= ?
          AND ((? IS NOT NULL AND email = ?) OR (? IS NOT NULL AND phone = ?))
        LIMIT 1`,
      [analysisId, since, email, email, phone, phone],
    );
    return rows.length > 0;
  }

  async insertLead(l: {
    id: string; analysisId: string; urlSite: string; name: string | null; email: string | null;
    phone: string | null; message: string | null; locale: string; clerkUserId: string | null; ipAddress: string | null;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO leads (id, analysis_id, url_site, name, email, phone, message, locale, clerk_user_id, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [l.id, l.analysisId, l.urlSite, l.name, l.email, l.phone, l.message, l.locale, l.clerkUserId, l.ipAddress],
    );
  }

  async listLeads(limit: number, offset: number): Promise<{ rows: any[]; total: number }> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT l.id, l.analysis_id, l.url_site, l.name, l.email, l.phone, l.message, l.locale, l.status, l.created_at,
              a.score_performance, a.platform, a.report_url
         FROM leads l LEFT JOIN analyses a ON a.id = l.analysis_id
        ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    const [[count]] = await this.pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS cnt FROM leads');
    return {
      total: Number(count?.cnt ?? 0),
      rows: rows.map((r) => ({
        id: r.id, analysisId: r.analysis_id, urlSite: r.url_site, name: r.name ?? null, email: r.email ?? null,
        phone: r.phone ?? null, message: r.message ?? null, locale: r.locale, status: r.status, createdAt: r.created_at,
        scorePerformance: r.score_performance ?? null, platform: r.platform ?? null, reportUrl: r.report_url ?? null,
      })),
    };
  }

  async createAdminNotification(type: string, message: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO admin_notifications (id, type, message, read_status, created_at) VALUES (UUID(), ?, ?, FALSE, NOW())`,
      [type, message],
    );
  }

  // ── Espaces agence (workspaces) ────────────────────────────────────────

  private rowToWorkspace(r: any): Workspace {
    return {
      id: r.id, name: r.name, logoUrl: r.logo_url ?? null, brandColor: r.brand_color,
      defaultLocale: r.default_locale, ownerClerkUserId: r.owner_clerk_user_id, createdAt: r.created_at,
    };
  }

  /** Crée l'espace et inscrit le créateur comme propriétaire. */
  async createWorkspace(w: Omit<Workspace, 'createdAt'>): Promise<void> {
    await this.pool.query(
      `INSERT INTO workspaces (id, name, logo_url, brand_color, default_locale, owner_clerk_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [w.id, w.name, w.logoUrl, w.brandColor, w.defaultLocale, w.ownerClerkUserId],
    );
    await this.pool.query(
      `INSERT INTO workspace_members (workspace_id, clerk_user_id, role) VALUES (?, ?, 'owner')`,
      [w.id, w.ownerClerkUserId],
    );
  }

  async findWorkspaceById(id: string): Promise<Workspace | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM workspaces WHERE id = ?', [id]);
    return rows[0] ? this.rowToWorkspace(rows[0]) : null;
  }

  /** Espaces dont l'utilisateur est membre, avec son rôle. */
  async findWorkspacesForUser(clerkUserId: string): Promise<(Workspace & { role: 'owner' | 'member' })[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT w.*, m.role FROM workspaces w JOIN workspace_members m ON m.workspace_id = w.id
        WHERE m.clerk_user_id = ? ORDER BY w.created_at`,
      [clerkUserId],
    );
    return rows.map((r) => ({ ...this.rowToWorkspace(r), role: r.role }));
  }

  async updateWorkspace(id: string, data: Partial<Pick<Workspace, 'name' | 'logoUrl' | 'brandColor' | 'defaultLocale'>>): Promise<void> {
    const map: Record<string, string> = { name: 'name', logoUrl: 'logo_url', brandColor: 'brand_color', defaultLocale: 'default_locale' };
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const [k, v] of Object.entries(data)) {
      if (map[k] && v !== undefined) { sets.push(`${map[k]} = ?`); values.push(v); }
    }
    if (!sets.length) return;
    await this.pool.query(`UPDATE workspaces SET ${sets.join(', ')} WHERE id = ?`, [...values, id]);
  }

  async findWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT clerk_user_id, role, created_at FROM workspace_members WHERE workspace_id = ? ORDER BY created_at`,
      [workspaceId],
    );
    return rows.map((r) => ({ clerkUserId: r.clerk_user_id, role: r.role, createdAt: r.created_at }));
  }

  async addWorkspaceMember(workspaceId: string, clerkUserId: string): Promise<void> {
    await this.pool.query(
      `INSERT IGNORE INTO workspace_members (workspace_id, clerk_user_id, role) VALUES (?, ?, 'member')`,
      [workspaceId, clerkUserId],
    );
  }

  async removeWorkspaceMember(workspaceId: string, clerkUserId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM workspace_members WHERE workspace_id = ? AND clerk_user_id = ? AND role <> 'owner'`,
      [workspaceId, clerkUserId],
    );
  }

  // ── Sites suivis ───────────────────────────────────────────────────────

  private rowToTrackedSite(r: any): TrackedSite {
    return {
      id: r.id, scope: r.scope, workspaceId: r.workspace_id ?? null, ownerClerkUserId: r.owner_clerk_user_id,
      urlSite: r.url_site, urlHash: r.url_hash, label: r.label ?? null, createdBy: r.created_by, createdAt: r.created_at,
      schedule: r.schedule ?? 'off', alertThreshold: r.alert_threshold ?? null, locale: r.locale ?? 'en',
      lastScheduledAt: r.last_scheduled_at ?? null, lastScore: r.last_score ?? null, lastAnalysisId: r.last_analysis_id ?? null,
    };
  }

  /** Sites dont l'audit programmé est dû (voir monitoring.dueBefore), les plus anciens d'abord. */
  async findDueTrackedSites(dueDaily: Date, dueWeekly: Date, limit: number): Promise<TrackedSite[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT * FROM tracked_sites
        WHERE (schedule = 'daily'  AND (last_scheduled_at IS NULL OR last_scheduled_at <= ?))
           OR (schedule = 'weekly' AND (last_scheduled_at IS NULL OR last_scheduled_at <= ?))
        ORDER BY last_scheduled_at IS NOT NULL, last_scheduled_at
        LIMIT ?`,
      [dueDaily, dueWeekly, limit],
    );
    return rows.map((r) => this.rowToTrackedSite(r));
  }

  async markTrackedSiteScheduled(id: string, at: Date): Promise<void> {
    await this.pool.query('UPDATE tracked_sites SET last_scheduled_at = ? WHERE id = ?', [at, id]);
  }

  async updateTrackedSiteMonitoring(id: string, m: { schedule: string; alertThreshold: number | null; locale: string }): Promise<void> {
    await this.pool.query(
      'UPDATE tracked_sites SET schedule = ?, alert_threshold = ?, locale = ? WHERE id = ?',
      [m.schedule, m.alertThreshold, m.locale, id],
    );
  }

  /** Résultat d'un audit programmé : dernier score (référence de la prochaine alerte) et date d'alerte éventuelle. */
  async recordTrackedSiteAudit(id: string, score: number | null, analysisId: string, alertedAt: Date | null): Promise<void> {
    await this.pool.query(
      `UPDATE tracked_sites SET last_score = ?, last_analysis_id = ?, last_alert_at = COALESCE(?, last_alert_at) WHERE id = ?`,
      [score, analysisId, alertedAt, id],
    );
  }

  async countTrackedSitesByOwner(ownerClerkUserId: string): Promise<number> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT COUNT(*) AS cnt FROM tracked_sites WHERE owner_clerk_user_id = ?',
      [ownerClerkUserId],
    );
    return Number(rows[0]?.cnt ?? 0);
  }

  /** false si le site est déjà suivi dans ce scope (clé unique scope + url_hash). */
  async insertTrackedSite(s: Omit<TrackedSite, 'createdAt'>): Promise<boolean> {
    const [res] = await this.pool.query<mysql.ResultSetHeader>(
      `INSERT IGNORE INTO tracked_sites (id, scope, workspace_id, owner_clerk_user_id, url_site, url_hash, label, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.id, s.scope, s.workspaceId, s.ownerClerkUserId, s.urlSite, s.urlHash, s.label, s.createdBy],
    );
    return res.affectedRows === 1;
  }

  async findTrackedSiteById(id: string): Promise<TrackedSite | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM tracked_sites WHERE id = ?', [id]);
    return rows[0] ? this.rowToTrackedSite(rows[0]) : null;
  }

  async deleteTrackedSite(id: string): Promise<void> {
    await this.pool.query('DELETE FROM tracked_sites WHERE id = ?', [id]);
  }

  /**
   * Sites d'un scope avec leur dernier audit terminé, parmi les audits lancés par `auditors`
   * (le titulaire en personnel, les membres pour un espace agence).
   */
  async listTrackedSites(scope: string, auditors: string[]): Promise<(TrackedSite & {
    lastAnalysisId: string | null; lastScore: number | null; lastAuditAt: Date | null;
  })[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT * FROM tracked_sites WHERE scope = ? ORDER BY created_at`,
      [scope],
    );
    if (!rows.length) return [];
    const [audits] = auditors.length
      ? await this.pool.query<mysql.RowDataPacket[]>(
          `SELECT a.id, a.url_hash, a.score_performance, a.created_at FROM analyses a
            WHERE a.url_hash IN (?) AND a.clerk_user_id IN (?) AND a.status = 'completed' AND a.deleted_at IS NULL
            ORDER BY a.created_at DESC`,
          [rows.map((r) => r.url_hash), auditors],
        )
      : [[] as mysql.RowDataPacket[]];
    const latest = new Map<string, mysql.RowDataPacket>();
    for (const a of audits) if (!latest.has(a.url_hash)) latest.set(a.url_hash, a);
    return rows.map((r) => {
      const a = latest.get(r.url_hash);
      return {
        ...this.rowToTrackedSite(r),
        lastAnalysisId: a?.id ?? null, lastScore: a?.score_performance ?? null, lastAuditAt: a?.created_at ?? null,
      };
    });
  }

  // ── Internal helpers ───────────────────────────────────────────────────

  private generateId(): string {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let id = 'c';
    for (let i = 0; i < 25; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }
}
