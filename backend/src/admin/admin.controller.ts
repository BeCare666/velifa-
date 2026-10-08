import {
  Controller, Get, Patch, Post, Body, Headers, Query,
  Param, UnauthorizedException, ForbiddenException,
  HttpCode, HttpStatus, Logger, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { AdminService } from './admin.service';
import { verifyClerkToken } from '../common/auth/clerk-auth.service';
import axios from 'axios';

// ── Clé secrète interne ───────────────────────────────────────────────────────
const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? 'velifa_admin_internal_2026';

function isInternalKey(auth: string | undefined, queryKey?: string): boolean {
  const key = queryKey ?? (auth?.startsWith('Bearer ') ? auth.slice(7) : auth ?? '');
  return key === ADMIN_API_KEY;
}

async function requireAdminOrKey(auth: string | undefined, queryKey?: string): Promise<string> {
  if (isInternalKey(auth, queryKey)) return 'internal';
  return requireAdmin(auth);
}

// ── Guard complet (Clerk JWT + vérif email) ───────────────────────────────────
async function requireAdmin(authHeader: string | undefined): Promise<string> {
  if (isInternalKey(authHeader)) return 'internal';

  const clerkUserId = await verifyClerkToken(authHeader);
  if (!clerkUserId) throw new UnauthorizedException('Authentication required');

  const secretKey   = process.env.CLERK_SECRET_KEY ?? '';
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

  try {
    const { data } = await axios.get(
      `https://api.clerk.com/v1/users/${clerkUserId}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    const email: string = data?.email_addresses?.[0]?.email_address ?? '';
    if (!adminEmails.includes(email.toLowerCase())) {
      throw new ForbiddenException('Admin access required');
    }
  } catch (err: any) {
    if (err instanceof ForbiddenException || err instanceof UnauthorizedException) throw err;
    throw new ForbiddenException('Admin access required');
  }

  return clerkUserId;
}

// ── Controller ────────────────────────────────────────────────────────────────
@Controller('admin')
@SkipThrottle()
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  /** GET /admin/stats */
  @Get('stats')
  async getStats(@Headers('authorization') auth: string | undefined) {
    await requireAdmin(auth);
    return this.adminService.getStats();
  }

  /** GET /admin/activity */
  @Get('activity')
  async getActivity(@Headers('authorization') auth: string | undefined) {
    await requireAdmin(auth);
    return this.adminService.getRecentActivity();
  }

  /** GET /admin/users */
  @Get('users')
  async getUsers(
    @Headers('authorization') auth: string | undefined,
    @Query('page')   page:   string = '1',
    @Query('limit')  limit:  string = '20',
    @Query('search') search: string = '',
    @Query('plan')   plan:   string = 'all',
  ) {
    await requireAdmin(auth);
    return this.adminService.getUsers(parseInt(page) || 1, parseInt(limit) || 20, search, plan);
  }

  /** GET /admin/users/subscribers */
  @Get('users/subscribers')
  async getSubscribers(@Headers('authorization') auth: string | undefined) {
    await requireAdmin(auth);
    return this.adminService.getSubscribers();
  }

  /** GET /admin/users/:clerkId/details */
  @Get('users/:clerkId/details')
  async getUserDetails(
    @Headers('authorization') auth: string | undefined,
    @Param('clerkId') clerkId: string,
  ) {
    await requireAdmin(auth);
    const data = await this.adminService.getUserDetails(clerkId);
    if (!data) return { error: 'User not found' };
    return data;
  }

  /** PATCH /admin/users/:clerkId/plan */
  @Patch('users/:clerkId/plan')
  @HttpCode(HttpStatus.OK)
  async updatePlan(
    @Headers('authorization') auth: string | undefined,
    @Param('clerkId') clerkId: string,
    @Body('plan') plan: string,
  ) {
    await requireAdmin(auth);
    if (!['free', 'pro', 'business'].includes(plan)) {
      throw new UnauthorizedException('Invalid plan');
    }
    await this.adminService.updateUserPlan(clerkId, plan);
    return { updated: true };
  }

  /** PATCH /admin/users/:clerkId/ban */
  @Patch('users/:clerkId/ban')
  @HttpCode(HttpStatus.OK)
  async banUser(
    @Headers('authorization') auth: string | undefined,
    @Param('clerkId') clerkId: string,
  ) {
    await requireAdmin(auth);
    await this.adminService.banUser(clerkId);
    return { banned: true };
  }

  /** PATCH /admin/users/:clerkId/suspend */
  @Patch('users/:clerkId/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendUser(
    @Headers('authorization') auth: string | undefined,
    @Param('clerkId') clerkId: string,
  ) {
    await requireAdmin(auth);
    await this.adminService.suspendUser(clerkId);
    return { suspended: true };
  }

  /** PATCH /admin/users/:clerkId/unsuspend */
  @Patch('users/:clerkId/unsuspend')
  @HttpCode(HttpStatus.OK)
  async unsuspendUser(
    @Headers('authorization') auth: string | undefined,
    @Param('clerkId') clerkId: string,
  ) {
    await requireAdmin(auth);
    await this.adminService.unsuspendUser(clerkId);
    return { unsuspended: true };
  }

  /** GET /admin/audits */
  @Get('audits')
  async getAudits(
    @Headers('authorization') auth: string | undefined,
    @Query('page')   page:   string = '1',
    @Query('limit')  limit:  string = '20',
    @Query('search') search: string = '',
    @Query('status') status: string = 'all',
    @Query('score')  score:  string = 'all',
  ) {
    await requireAdmin(auth);
    return this.adminService.getAudits(parseInt(page) || 1, parseInt(limit) || 20, search, status, score);
  }

  /** GET /admin/performance */
  @Get('performance')
  async getPerformance(@Headers('authorization') auth: string | undefined) {
    await requireAdmin(auth);
    return this.adminService.getPerformance();
  }

  /** GET /admin/revenue */
  @Get('revenue')
  async getRevenue(@Headers('authorization') auth: string | undefined) {
    await requireAdmin(auth);
    return this.adminService.getRevenue();
  }

  /** GET /admin/system */
  @Get('system')
  async getSystem(@Headers('authorization') auth: string | undefined) {
    await requireAdmin(auth);
    return this.adminService.getSystem();
  }

  /** GET /admin/notifications */
  @Get('notifications')
  async getNotifications(@Headers('authorization') auth: string | undefined) {
    await requireAdmin(auth);
    return this.adminService.getNotifications();
  }

  /** POST /admin/notifications/read-all */
  @Post('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@Headers('authorization') auth: string | undefined) {
    await requireAdmin(auth);
    return this.adminService.markAllNotificationsRead();
  }

  /** POST /admin/test-email */
  @Post('test-email')
  @HttpCode(HttpStatus.OK)
  async testEmail(@Headers('authorization') auth: string | undefined) {
    await requireAdmin(auth);
    return this.adminService.sendTestEmail();
  }

  /** POST /admin/clear-cache */
  @Post('clear-cache')
  @HttpCode(HttpStatus.OK)
  async clearCache(@Headers('authorization') auth: string | undefined) {
    await requireAdmin(auth);
    return this.adminService.clearCache();
  }

  /** GET /admin/export/users → CSV */
  @Get('export/users')
  async exportUsers(
    @Headers('authorization') auth: string | undefined,
    @Query('key') key: string | undefined,
    @Res() res: Response,
  ) {
    await requireAdminOrKey(auth, key);
    const csv = await this.adminService.exportUsers();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="velifa_users_${Date.now()}.csv"`);
    res.send(csv);
  }

  /** GET /admin/export/audits → CSV */
  @Get('export/audits')
  async exportAudits(
    @Headers('authorization') auth: string | undefined,
    @Query('key') key: string | undefined,
    @Res() res: Response,
  ) {
    await requireAdminOrKey(auth, key);
    const csv = await this.adminService.exportAudits();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="velifa_audits_${Date.now()}.csv"`);
    res.send(csv);
  }

  /** GET /admin/export/performance → CSV */
  @Get('export/performance')
  async exportPerformance(
    @Headers('authorization') auth: string | undefined,
    @Query('key') key: string | undefined,
    @Res() res: Response,
  ) {
    await requireAdminOrKey(auth, key);
    const csv = await this.adminService.exportPerformanceCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="velifa_performance_${Date.now()}.csv"`);
    res.send(csv);
  }
}
