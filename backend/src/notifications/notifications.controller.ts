import { Body, Controller, Get, Headers, Put, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { IsBoolean } from 'class-validator';
import { verifyClerkToken } from '../common/auth/clerk-auth.service';
import { DatabaseService } from '../prisma/database.service';
import { DEFAULT_NOTIFICATION_PREFS, NotificationPrefs } from './notification-prefs';

class NotificationPrefsDto {
  @IsBoolean() reports: boolean = true;
  @IsBoolean() alerts: boolean = true;
}

/** Préférences de notification du compte connecté. */
@Controller('me/notifications')
@UseGuards(ThrottlerGuard)
export class NotificationsController {
  constructor(private readonly db: DatabaseService) {}

  private async user(auth: string | undefined): Promise<string> {
    const id = await verifyClerkToken(auth);
    if (!id) throw new UnauthorizedException('Valid Clerk token required');
    return id;
  }

  @Get()
  async get(@Headers('authorization') auth: string | undefined): Promise<NotificationPrefs> {
    return (await this.db.getNotificationPrefs(await this.user(auth))) ?? DEFAULT_NOTIFICATION_PREFS;
  }

  @Put()
  async set(@Headers('authorization') auth: string | undefined, @Body() dto: NotificationPrefsDto): Promise<NotificationPrefs> {
    const id = await this.user(auth);
    await this.db.setNotificationPrefs(id, { reports: dto.reports, alerts: dto.alerts });
    return { reports: dto.reports, alerts: dto.alerts };
  }
}
