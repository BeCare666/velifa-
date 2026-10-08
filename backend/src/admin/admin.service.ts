import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../prisma/database.service';
import * as mysql from 'mysql2/promise';
import * as os from 'os';
import { randomUUID } from 'crypto';
import axios from 'axios';

const PRO_PRICE_EUR      = 9;
const BUSINESS_PRICE_EUR = 29;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly startedAt = new Date();

  constructor(private readonly db: DatabaseService) {}

  // ── Global stats ──────────────────────────────────────────────────────────

  async getStats() {
    const pool = (this.db as any).pool as mysql.Pool;

    const [[totalUsers]]   = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS cnt FROM users');
    const [[totalAudits]]  = await pool.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS cnt FROM analyses WHERE deleted_at IS NULL");
    const [[todayAudits]]  = await pool.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS cnt FROM analyses WHERE DATE(created_at) = CURDATE() AND deleted_at IS NULL");
    const [[yesterdayAudits]] = await pool.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS cnt FROM analyses WHERE DATE(created_at) = DATE_SUB(CURDATE(),INTERVAL 1 DAY) AND deleted_at IS NULL");
    const [[weekAudits]]   = await pool.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS cnt FROM analyses WHERE created_at >= DATE_SUB(CURDATE(),INTERVAL 7 DAY) AND deleted_at IS NULL");
    const [[prevWeekAudits]] = await pool.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS cnt FROM analyses WHERE created_at >= DATE_SUB(CURDATE(),INTERVAL 14 DAY) AND created_at < DATE_SUB(CURDATE(),INTERVAL 7 DAY) AND deleted_at IS NULL");
    const [[proUsers]]     = await pool.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS cnt FROM users WHERE subscription_plan='pro' AND subscription_status='active'");
    const [[bizUsers]]     = await pool.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS cnt FROM users WHERE subscription_plan='business' AND subscription_status='active'");
    const [[avgScore]]     = await pool.query<mysql.RowDataPacket[]>("SELECT ROUND(AVG(score_performance),1) AS avg FROM analyses WHERE status='completed' AND deleted_at IS NULL");
    const [[failedAudits]] = await pool.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS cnt FROM analyses WHERE status='failed'");
    const [[completedAudits]] = await pool.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS cnt FROM analyses WHERE status='completed' AND deleted_at IS NULL");

    const proCount  = Number((proUsers as any)?.cnt  ?? 0);
    const bizCount  = Number((bizUsers as any)?.cnt ?? 0);
    const revenue   = proCount * PRO_PRICE_EUR + bizCount * BUSINESS_PRICE_EUR;
    const todayCnt  = Number((todayAudits as any)?.cnt ?? 0);
    const yesterdayCnt = Number((yesterdayAudits as any)?.cnt ?? 0);
    const weekCnt   = Number((weekAudits as any)?.cnt ?? 0);
    const prevWeekCnt = Number((prevWeekAudits as any)?.cnt ?? 0);

    // Audits last 30 days avec completed/failed split
    const [dailyRows] = await pool.query<mysql.RowDataPacket[]>(`
      SELECT DATE(created_at) AS day,
             COUNT(*) AS cnt,
             SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS ok,
             SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS fail
      FROM analyses
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY) AND deleted_at IS NULL
      GROUP BY day ORDER BY day ASC
    `);

    // Scores moyens par jour (7 derniers jours)
    const [scoreRows] = await pool.query<mysql.RowDataPacket[]>(`
      SELECT DATE(created_at) AS day, ROUND(AVG(score_performance),1) AS avg_score
      FROM analyses
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        AND status='completed' AND deleted_at IS NULL AND score_performance IS NOT NULL
      GROUP BY day ORDER BY day ASC
    `);

    // Plan distribution
    const [planRows] = await pool.query<mysql.RowDataPacket[]>(`
      SELECT subscription_plan AS plan, COUNT(*) AS cnt
      FROM users GROUP BY subscription_plan
    `);

    const totalCnt = Number((totalAudits as any)?.cnt ?? 0);
    const successRate = totalCnt > 0 ? Math.round(Number((completedAudits as any)?.cnt ?? 0) / totalCnt * 100) : 0;

    return {
      totalUsers:    Number((totalUsers as any)?.cnt   ?? 0),
      totalAudits:   totalCnt,
      todayAudits:   todayCnt,
      proUsers:      proCount,
      businessUsers: bizCount,
      failedAudits:  Number((failedAudits as any)?.cnt ?? 0),
      avgScore:      Number((avgScore as any)?.avg      ?? 0),
      estimatedRevenue: revenue,
      successRate,
      trends: {
        todayVsYesterday: todayCnt - yesterdayCnt,
        weekVsPrevWeek:   weekCnt - prevWeekCnt,
      },
      dailyAudits: dailyRows.map(r => ({
        day:  r.day,
        cnt:  Number(r.cnt),
        ok:   Number(r.ok),
        fail: Number(r.fail),
      })),
      scoresByDay: scoreRows.map(r => ({
        day:   r.day,
        score: Number(r.avg_score),
      })),
      planDistribution: planRows.map(r => ({
        plan: r.plan ?? 'free',
        cnt:  Number(r.cnt),
      })),
    };
  }

  // ── Recent activity ────────────────────────────────────────────────────────

  async getRecentActivity() {
    const pool = (this.db as any).pool as mysql.Pool;

    const [recentAudits] = await pool.query<mysql.RowDataPacket[]>(`
      SELECT id, url_site, score_performance, status, clerk_user_id, created_at
      FROM analyses WHERE deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 10
    `);

    const [recentUsers] = await pool.query<mysql.RowDataPacket[]>(`
      SELECT clerk_user_id, subscription_plan, subscription_status, updated_at
      FROM users ORDER BY updated_at DESC LIMIT 5
    `);

    return {
      recentAudits: recentAudits.map(r => ({
        id:           r.id,
        url:          r.url_site,
        score:        r.score_performance,
        status:       r.status,
        clerkUserId:  r.clerk_user_id,
        createdAt:    r.created_at,
      })),
      recentUsers: recentUsers.map(r => ({
        clerkUserId:  r.clerk_user_id,
        plan:         r.subscription_plan,
        status:       r.subscription_status,
        updatedAt:    r.updated_at,
      })),
    };
  }

  // ── Users paginated ────────────────────────────────────────────────────────

  async getUsers(page: number, limit: number, search: string, planFilter: string) {
    const pool   = (this.db as any).pool as mysql.Pool;
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      where += ' AND u.clerk_user_id LIKE ?';
      params.push(`%${search}%`);
    }
    if (planFilter && planFilter !== 'all') {
      if (planFilter === 'free') {
        where += ' AND (u.subscription_plan IS NULL OR u.subscription_plan = "")';
      } else {
        where += ' AND u.subscription_plan = ?';
        params.push(planFilter);
      }
    }

    const [[{ total }]] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM users u ${where}`, params
    );

    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT u.clerk_user_id, u.subscription_plan, u.subscription_status,
              u.lemon_subscription_id, u.updated_at,
              u.suspended, u.suspended_at,
              COUNT(a.id) AS audit_count
       FROM users u
       LEFT JOIN analyses a ON a.clerk_user_id = u.clerk_user_id AND a.deleted_at IS NULL
       ${where}
       GROUP BY u.clerk_user_id
       ORDER BY u.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      total:  Number(total),
      page,
      limit,
      users: rows.map(r => ({
        clerkUserId:    r.clerk_user_id,
        plan:           r.subscription_plan,
        status:         r.subscription_status,
        lemonSubId:     r.lemon_subscription_id,
        updatedAt:      r.updated_at,
        auditCount:     Number(r.audit_count),
        suspended:      r.suspended === 1 || r.suspended === true,
        suspendedAt:    r.suspended_at ?? null,
      })),
    };
  }

  // ── Subscribers (Pro / Business) ──────────────────────────────────────────

  async getSubscribers() {
    const pool = (this.db as any).pool as mysql.Pool;

    const [users] = await pool.query<mysql.RowDataPacket[]>(`
      SELECT clerk_user_id, subscription_plan, subscription_status, suspended, suspended_at, updated_at
      FROM users
      WHERE subscription_plan IN ('pro', 'business')
      ORDER BY updated_at DESC
    `);

    const results = [];
    for (const u of users) {
      const clerkUserId = u.clerk_user_id;

      // Aggregat global
      const [[agg]] = await pool.query<mysql.RowDataPacket[]>(`
        SELECT COUNT(DISTINCT url_site) AS sites_count,
               COUNT(*) AS audits_count,
               ROUND(AVG(score_performance), 1) AS avg_score
        FROM analyses
        WHERE clerk_user_id = ? AND status = 'completed' AND deleted_at IS NULL
      `, [clerkUserId]);

      // Per-site breakdown (avec dernier audit pour issues + tendance)
      const [siteRows] = await pool.query<mysql.RowDataPacket[]>(`
        WITH ranked AS (
          SELECT url_site, score_performance, created_at,
                 lcp_mobile, cls_mobile, tbt_mobile,
                 score_seo, score_accessibility, score_best_practices,
                 ROW_NUMBER() OVER (PARTITION BY url_site ORDER BY created_at DESC) AS rn
          FROM analyses
          WHERE clerk_user_id = ? AND status = 'completed' AND deleted_at IS NULL
        )
        SELECT
          url_site,
          COUNT(*) AS cnt,
          ROUND(AVG(score_performance), 1) AS avg_score,
          MAX(CASE WHEN rn = 1 THEN score_performance END) AS last_score,
          MAX(CASE WHEN rn = 2 THEN score_performance END) AS prev_score,
          MAX(CASE WHEN rn = 1 THEN created_at END)        AS last_date,
          MAX(CASE WHEN rn = 1 THEN lcp_mobile END)        AS last_lcp,
          MAX(CASE WHEN rn = 1 THEN cls_mobile END)        AS last_cls,
          MAX(CASE WHEN rn = 1 THEN tbt_mobile END)        AS last_tbt,
          MAX(CASE WHEN rn = 1 THEN score_seo END)         AS last_seo,
          MAX(CASE WHEN rn = 1 THEN score_accessibility END) AS last_accessibility,
          MAX(CASE WHEN rn = 1 THEN score_best_practices END) AS last_best_practices
        FROM ranked
        GROUP BY url_site
        ORDER BY avg_score ASC
      `, [clerkUserId]);

      // Issues + trend per site
      const sites = siteRows.map(r => {
        const lastScore = r.last_score != null ? Number(r.last_score) : null;
        const prevScore = r.prev_score != null ? Number(r.prev_score) : null;

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (lastScore != null && prevScore != null) {
          const delta = lastScore - prevScore;
          if (delta >= 3) trend = 'up';
          else if (delta <= -3) trend = 'down';
        }

        const lcp = r.last_lcp != null ? Number(r.last_lcp) : null;
        const cls = r.last_cls != null ? Number(r.last_cls) : null;
        const tbt = r.last_tbt != null ? Number(r.last_tbt) : null;
        const seo = r.last_seo != null ? Number(r.last_seo) : null;
        const acc = r.last_accessibility != null ? Number(r.last_accessibility) : null;
        const bp  = r.last_best_practices != null ? Number(r.last_best_practices) : null;

        const issues: string[] = [];
        if (lcp != null && lcp > 2500)  issues.push('lcp');
        if (cls != null && cls > 0.1)   issues.push('cls');
        if (tbt != null && tbt > 300)   issues.push('tbt');
        if (seo != null && seo < 70)    issues.push('seo');
        if (acc != null && acc < 70)    issues.push('accessibility');
        if (bp  != null && bp  < 70)    issues.push('best_practices');

        return {
          url:        r.url_site,
          count:      Number(r.cnt),
          avgScore:   Number(r.avg_score ?? 0),
          lastScore,
          prevScore,
          lastDate:   r.last_date,
          trend,
          issues,
        };
      });

      // Total problems
      const totalProblems = sites.reduce((sum, s) => sum + s.issues.length, 0);

      // Performance distribution (based on per-site avg score)
      const total = sites.length || 1;
      const critical = sites.filter(s => s.avgScore < 50).length;
      const needsImprovement = sites.filter(s => s.avgScore >= 50 && s.avgScore < 80).length;
      const good = sites.filter(s => s.avgScore >= 80).length;

      // Worst / best site
      const sorted = [...sites].sort((a, b) => a.avgScore - b.avgScore);
      const worstSite = sorted[0] ? { url: sorted[0].url, score: sorted[0].avgScore } : null;
      const bestSite  = sorted[sorted.length - 1] ? { url: sorted[sorted.length - 1].url, score: sorted[sorted.length - 1].avgScore } : null;

      results.push({
        clerkUserId,
        plan:       u.subscription_plan,
        status:     u.subscription_status,
        suspended:  u.suspended === 1 || u.suspended === true,
        suspendedAt: u.suspended_at ?? null,
        sitesCount:  Number((agg as any)?.sites_count ?? 0),
        auditsCount: Number((agg as any)?.audits_count ?? 0),
        avgScore:    Number((agg as any)?.avg_score ?? 0),
        totalProblems,
        performanceDistribution: {
          critical:         Math.round(critical / total * 100),
          needsImprovement: Math.round(needsImprovement / total * 100),
          good:             Math.round(good / total * 100),
        },
        worstSite,
        bestSite,
        sites,
      });
    }

    // Fetch emails from Clerk (best effort, in parallel)
    const secretKey = process.env.CLERK_SECRET_KEY ?? '';
    await Promise.all(results.map(async (r: any) => {
      try {
        const { data } = await axios.get(
          `https://api.clerk.com/v1/users/${r.clerkUserId}`,
          { headers: { Authorization: `Bearer ${secretKey}` } }
        );
        r.email = data?.email_addresses?.[0]?.email_address ?? null;
      } catch {
        r.email = null;
      }
    }));

    return results;
  }

  // ── User details ──────────────────────────────────────────────────────────

  async getUserDetails(clerkUserId: string) {
    const pool = (this.db as any).pool as mysql.Pool;

    const [[userRow]] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT clerk_user_id, subscription_plan, subscription_status,
              suspended, suspended_at, updated_at, lemon_subscription_id
       FROM users WHERE clerk_user_id = ? LIMIT 1`,
      [clerkUserId]
    );

    if (!userRow) return null;

    // Audits stats
    const [[auditStats]] = await pool.query<mysql.RowDataPacket[]>(`
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
             SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed,
             ROUND(AVG(CASE WHEN status='completed' THEN score_performance END), 1) AS avg_score
      FROM analyses WHERE clerk_user_id = ? AND deleted_at IS NULL
    `, [clerkUserId]);

    // Sites with avg scores
    const [siteRows] = await pool.query<mysql.RowDataPacket[]>(`
      SELECT url_site,
             COUNT(*) AS cnt,
             ROUND(AVG(score_performance), 1) AS avg_score,
             MAX(score_performance) AS last_score,
             MAX(created_at) AS last_date
      FROM analyses
      WHERE clerk_user_id = ? AND status='completed' AND deleted_at IS NULL
      GROUP BY url_site ORDER BY last_date DESC LIMIT 20
    `, [clerkUserId]);

    // Recent audits (paginated subset)
    const [recentAudits] = await pool.query<mysql.RowDataPacket[]>(`
      SELECT id, url_site, score_performance, score_seo, status, created_at, completed_at
      FROM analyses WHERE clerk_user_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 30
    `, [clerkUserId]);

    // Score evolution (30 last completed)
    const [scoreHistory] = await pool.query<mysql.RowDataPacket[]>(`
      SELECT DATE(created_at) AS day, ROUND(AVG(score_performance), 1) AS score
      FROM analyses
      WHERE clerk_user_id = ? AND status='completed' AND deleted_at IS NULL
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
      GROUP BY day ORDER BY day ASC
    `, [clerkUserId]);

    return {
      user: {
        clerkUserId:    userRow.clerk_user_id,
        plan:           userRow.subscription_plan,
        status:         userRow.subscription_status,
        suspended:      userRow.suspended === 1 || userRow.suspended === true,
        suspendedAt:    userRow.suspended_at ?? null,
        updatedAt:      userRow.updated_at,
        lemonSubId:     userRow.lemon_subscription_id,
      },
      stats: {
        totalAudits:    Number((auditStats as any)?.total ?? 0),
        completedAudits: Number((auditStats as any)?.completed ?? 0),
        failedAudits:   Number((auditStats as any)?.failed ?? 0),
        avgScore:       Number((auditStats as any)?.avg_score ?? 0),
      },
      sites: siteRows.map(r => ({
        url:       r.url_site,
        count:     Number(r.cnt),
        avgScore:  Number(r.avg_score ?? 0),
        lastScore: Number(r.last_score ?? 0),
        lastDate:  r.last_date,
      })),
      recentAudits: recentAudits.map(r => ({
        id:          r.id,
        url:         r.url_site,
        score:       r.score_performance,
        scoreSeo:    r.score_seo,
        status:      r.status,
        createdAt:   r.created_at,
        completedAt: r.completed_at,
      })),
      scoreHistory: scoreHistory.map(r => ({
        day:   r.day,
        score: Number(r.score ?? 0),
      })),
    };
  }

  // ── Update plan ────────────────────────────────────────────────────────────

  async updateUserPlan(clerkUserId: string, plan: string) {
    const pool = (this.db as any).pool as mysql.Pool;
    const status = plan === 'free' ? 'cancelled' : 'active';
    const planValue = plan === 'free' ? null : plan;

    await pool.query(
      `UPDATE users SET subscription_plan = ?, subscription_status = ?, updated_at = NOW()
       WHERE clerk_user_id = ?`,
      [planValue, status, clerkUserId]
    );
    this.logger.log(`Admin updated plan for ${clerkUserId} → ${plan}`);
  }

  // ── Suspend / unsuspend ───────────────────────────────────────────────────

  async suspendUser(clerkUserId: string) {
    const pool = (this.db as any).pool as mysql.Pool;
    await pool.query(
      `UPDATE users SET suspended = TRUE, suspended_at = NOW(), updated_at = NOW()
       WHERE clerk_user_id = ?`,
      [clerkUserId]
    );
    await this.createNotification('suspension', `Utilisateur suspendu : ${clerkUserId}`);
    this.logger.warn(`Admin suspended user ${clerkUserId}`);
  }

  async unsuspendUser(clerkUserId: string) {
    const pool = (this.db as any).pool as mysql.Pool;
    await pool.query(
      `UPDATE users SET suspended = FALSE, suspended_at = NULL, updated_at = NOW()
       WHERE clerk_user_id = ?`,
      [clerkUserId]
    );
    await this.createNotification('info', `Compte reactive : ${clerkUserId}`);
    this.logger.log(`Admin unsuspended user ${clerkUserId}`);
  }

  // ── Audits paginated ───────────────────────────────────────────────────────

  async getAudits(page: number, limit: number, search: string, statusFilter: string, scoreFilter: string) {
    const pool   = (this.db as any).pool as mysql.Pool;
    const offset = (page - 1) * limit;

    let where = 'WHERE deleted_at IS NULL';
    const params: any[] = [];

    if (search) {
      where += ' AND (url_site LIKE ? OR clerk_user_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (statusFilter && statusFilter !== 'all') {
      where += ' AND status = ?';
      params.push(statusFilter);
    }
    if (scoreFilter === 'good') {
      where += ' AND score_performance >= 90';
    } else if (scoreFilter === 'average') {
      where += ' AND score_performance >= 50 AND score_performance < 90';
    } else if (scoreFilter === 'poor') {
      where += ' AND score_performance < 50';
    }

    const [[{ total }]] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM analyses ${where}`, params
    );

    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT id, url_site, score_performance, score_seo, status, clerk_user_id, created_at, completed_at
       FROM analyses ${where}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      total:  Number(total),
      page,
      limit,
      audits: rows.map(r => ({
        id:          r.id,
        url:         r.url_site,
        score:       r.score_performance,
        scoreSeo:    r.score_seo,
        status:      r.status,
        clerkUserId: r.clerk_user_id,
        createdAt:   r.created_at,
        completedAt: r.completed_at,
      })),
    };
  }

  // ── Performance analysis ───────────────────────────────────────────────────

  async getPerformance() {
    const pool = (this.db as any).pool as mysql.Pool;

    const [rows] = await pool.query<mysql.RowDataPacket[]>(`
      WITH ranked AS (
        SELECT url_site, score_performance, created_at,
               lcp_mobile, cls_mobile, tbt_mobile,
               score_seo, score_accessibility, score_best_practices,
               ROW_NUMBER() OVER (PARTITION BY url_site ORDER BY created_at DESC) AS rn
        FROM analyses
        WHERE status = 'completed' AND deleted_at IS NULL
      )
      SELECT
        url_site,
        COUNT(*) AS audit_count,
        ROUND(AVG(score_performance), 1) AS avg_score,
        MAX(CASE WHEN rn = 1 THEN score_performance END) AS last_score,
        MAX(CASE WHEN rn = 2 THEN score_performance END) AS prev_score,
        MAX(CASE WHEN rn = 1 THEN created_at END)        AS last_date,
        MAX(CASE WHEN rn = 1 THEN lcp_mobile END)        AS last_lcp,
        MAX(CASE WHEN rn = 1 THEN cls_mobile END)        AS last_cls,
        MAX(CASE WHEN rn = 1 THEN tbt_mobile END)        AS last_tbt,
        MAX(CASE WHEN rn = 1 THEN score_seo END)         AS last_seo,
        MAX(CASE WHEN rn = 1 THEN score_accessibility END) AS last_accessibility,
        MAX(CASE WHEN rn = 1 THEN score_best_practices END) AS last_best_practices
      FROM ranked
      GROUP BY url_site
      ORDER BY avg_score ASC
      LIMIT 300
    `);

    return rows.map(r => {
      const lastScore = r.last_score != null ? Number(r.last_score) : null;
      const prevScore = r.prev_score != null ? Number(r.prev_score) : null;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (lastScore != null && prevScore != null) {
        const delta = lastScore - prevScore;
        if (delta >= 3) trend = 'up';
        else if (delta <= -3) trend = 'down';
      }

      const issues: string[] = [];
      const lcp = r.last_lcp != null ? Number(r.last_lcp) : null;
      const cls = r.last_cls != null ? Number(r.last_cls) : null;
      const tbt = r.last_tbt != null ? Number(r.last_tbt) : null;
      const seo = r.last_seo != null ? Number(r.last_seo) : null;
      const acc = r.last_accessibility != null ? Number(r.last_accessibility) : null;
      const bp  = r.last_best_practices != null ? Number(r.last_best_practices) : null;

      if (lcp != null && lcp > 2500)  issues.push('LCP lent');
      if (cls != null && cls > 0.1)   issues.push('Instabilite visuelle');
      if (tbt != null && tbt > 300)   issues.push('Page peu reactive');
      if (seo != null && seo < 70)    issues.push('Problemes SEO');
      if (acc != null && acc < 70)    issues.push('Problemes accessibilite');
      if (bp  != null && bp  < 70)    issues.push('Mauvaises pratiques');

      return {
        url:        r.url_site,
        auditCount: Number(r.audit_count),
        avgScore:   Number(r.avg_score ?? 0),
        lastScore,
        prevScore,
        lastDate:   r.last_date,
        trend,
        issues,
        metrics: { lcp, cls, tbt, seo, acc, bp },
      };
    });
  }

  // ── Revenue ────────────────────────────────────────────────────────────────

  async getRevenue() {
    const pool = (this.db as any).pool as mysql.Pool;

    const [subs] = await pool.query<mysql.RowDataPacket[]>(`
      SELECT clerk_user_id, subscription_plan, subscription_status, updated_at
      FROM users
      WHERE subscription_status = 'active' AND subscription_plan IN ('pro', 'business')
      ORDER BY updated_at DESC
    `);

    const proList  = subs.filter(s => s.subscription_plan === 'pro');
    const bizList  = subs.filter(s => s.subscription_plan === 'business');

    return {
      proCount:      proList.length,
      businessCount: bizList.length,
      priceProEur:      PRO_PRICE_EUR,
      priceBusinessEur: BUSINESS_PRICE_EUR,
      estimatedMonthly: proList.length * PRO_PRICE_EUR + bizList.length * BUSINESS_PRICE_EUR,
      subscriptions: subs.map(s => ({
        clerkUserId: s.clerk_user_id,
        plan:        s.subscription_plan,
        since:       s.updated_at,
      })),
    };
  }

  // ── System ────────────────────────────────────────────────────────────────

  async getSystem() {
    const pool = (this.db as any).pool as mysql.Pool;

    let dbOk = false;
    try { await pool.query('SELECT 1'); dbOk = true; } catch { /* noop */ }

    const uptimeSeconds = Math.floor((Date.now() - this.startedAt.getTime()) / 1000);

    return {
      nodeVersion:    process.version,
      platform:       process.platform,
      uptimeSeconds,
      memoryMb:       Math.round(process.memoryUsage().rss / 1024 / 1024),
      cpuCores:       os.cpus().length,
      dbConnected:    dbOk,
      startedAt:      this.startedAt.toISOString(),
      adminEmails:    (process.env.ADMIN_EMAILS ?? '').split(',').filter(Boolean),
    };
  }

  // ── Ban user (soft delete all audits) ─────────────────────────────────────

  async banUser(clerkUserId: string) {
    const pool = (this.db as any).pool as mysql.Pool;
    await pool.query(
      `UPDATE analyses SET deleted_at = NOW() WHERE clerk_user_id = ? AND deleted_at IS NULL`,
      [clerkUserId]
    );
    this.logger.warn(`Admin banned user ${clerkUserId}`);
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  async getNotifications() {
    const pool = (this.db as any).pool as mysql.Pool;
    const [rows] = await pool.query<mysql.RowDataPacket[]>(`
      SELECT id, type, message, read_status, created_at
      FROM admin_notifications
      ORDER BY created_at DESC LIMIT 100
    `);
    const unread = rows.filter(r => !r.read_status).length;
    return {
      notifications: rows.map(r => ({
        id:        r.id,
        type:      r.type,
        message:   r.message,
        read:      r.read_status === 1 || r.read_status === true,
        createdAt: r.created_at,
      })),
      unread,
    };
  }

  async markAllNotificationsRead() {
    const pool = (this.db as any).pool as mysql.Pool;
    await pool.query(`UPDATE admin_notifications SET read_status = TRUE WHERE read_status = FALSE`);
    return { ok: true };
  }

  async createNotification(type: string, message: string) {
    const pool = (this.db as any).pool as mysql.Pool;
    const id = randomUUID();
    try {
      await pool.query(
        `INSERT INTO admin_notifications (id, type, message, read_status, created_at) VALUES (?, ?, ?, FALSE, NOW())`,
        [id, type, message]
      );
    } catch (e: any) {
      this.logger.error('createNotification failed', e.message);
    }
  }

  // ── Send test email via Brevo ─────────────────────────────────────────────

  async sendTestEmail() {
    const apiKey = process.env.BREVO_API_KEY ?? '';
    const from   = process.env.BREVO_FROM_EMAIL ?? 'devvelifa@gmail.com';
    const admin  = (process.env.ADMIN_EMAILS ?? '').split(',')[0]?.trim();

    if (!apiKey || !admin) return { sent: false, reason: 'Missing config' };

    try {
      const axios = await import('axios');
      await axios.default.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender:   { email: from, name: 'VELIFA' },
          to:       [{ email: admin }],
          subject:  '[VELIFA Admin] Email test',
          htmlContent: '<p>Email Brevo operationnel depuis le dashboard admin VELIFA.</p>',
        },
        { headers: { 'api-key': apiKey, 'Content-Type': 'application/json' } }
      );
      return { sent: true };
    } catch (e: any) {
      this.logger.error('Test email failed', e.message);
      return { sent: false, reason: e.message };
    }
  }

  // ── Clear Redis cache ─────────────────────────────────────────────────────

  async clearCache() {
    try {
      const Redis = (await import('ioredis')).default;
      const client = new Redis(process.env.REDIS_URL ?? '');
      await client.flushdb();
      await client.quit();
      this.logger.log('Admin cleared Redis cache');
      return { cleared: true };
    } catch (e: any) {
      this.logger.error('Clear cache failed', e.message);
      return { cleared: false, reason: e.message };
    }
  }

  // ── Export CSV users ──────────────────────────────────────────────────────

  async exportUsers(): Promise<string> {
    const pool = (this.db as any).pool as mysql.Pool;
    const [rows] = await pool.query<mysql.RowDataPacket[]>(`
      SELECT u.clerk_user_id, u.subscription_plan, u.subscription_status,
             u.suspended, u.updated_at, COUNT(a.id) AS audit_count
      FROM users u
      LEFT JOIN analyses a ON a.clerk_user_id = u.clerk_user_id AND a.deleted_at IS NULL
      GROUP BY u.clerk_user_id ORDER BY u.updated_at DESC
    `);
    const lines = ['clerk_user_id,plan,status,suspended,audit_count,updated_at'];
    for (const r of rows) {
      lines.push(`${r.clerk_user_id},${r.subscription_plan ?? 'free'},${r.subscription_status ?? ''},${r.suspended ? 'yes' : 'no'},${r.audit_count},${r.updated_at ?? ''}`);
    }
    return lines.join('\n');
  }

  // ── Export CSV audits ─────────────────────────────────────────────────────

  async exportAudits(): Promise<string> {
    const pool = (this.db as any).pool as mysql.Pool;
    const [rows] = await pool.query<mysql.RowDataPacket[]>(`
      SELECT id, url_site, score_performance, score_seo, status, clerk_user_id, created_at
      FROM analyses WHERE deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 5000
    `);
    const lines = ['id,url,score_performance,score_seo,status,clerk_user_id,created_at'];
    for (const r of rows) {
      const url = `"${(r.url_site ?? '').replace(/"/g, '""')}"`;
      lines.push(`${r.id},${url},${r.score_performance ?? ''},${r.score_seo ?? ''},${r.status ?? ''},${r.clerk_user_id ?? ''},${r.created_at ?? ''}`);
    }
    return lines.join('\n');
  }

  // ── Export CSV performance ────────────────────────────────────────────────

  async exportPerformanceCsv(): Promise<string> {
    const data = await this.getPerformance();
    const lines = ['url,avg_score,audit_count,last_score,trend,issues'];
    for (const r of data) {
      const url = `"${r.url.replace(/"/g, '""')}"`;
      const issues = `"${r.issues.join(', ')}"`;
      lines.push(`${url},${r.avgScore},${r.auditCount},${r.lastScore ?? ''},${r.trend},${issues}`);
    }
    return lines.join('\n');
  }
}
