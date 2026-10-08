import { Injectable, Logger } from '@nestjs/common';
import { verifyToken } from '@clerk/backend';

/**
 * Optional Clerk token verification.
 * - If Authorization header is present with a Clerk JWT → verify and return userId
 * - If no header or invalid token → return null (anonymous audit, no blocking)
 */
@Injectable()
export class ClerkAuthService {
  private readonly logger = new Logger(ClerkAuthService.name);

  async verifyToken(authHeader: string | undefined): Promise<string | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const secretKey = process.env.CLERK_SECRET_KEY ?? '';
    if (!secretKey) {
      this.logger.warn('CLERK_SECRET_KEY not configured — skipping Clerk verification');
      return null;
    }

    const token = authHeader.slice(7);
    try {
      const payload = await verifyToken(token, { secretKey });
      const userId = payload?.sub ?? null;
      this.logger.debug(`Clerk user verified: ${userId}`);
      return userId;
    } catch (err: any) {
      this.logger.warn(`Clerk token verification failed: ${err.message}`);
      return null;
    }
  }
}

/**
 * Utility function for use in controllers.
 * Returns clerkUserId if valid, null otherwise.
 */
export async function verifyClerkToken(authHeader: string | undefined): Promise<string | null> {
  return new ClerkAuthService().verifyToken(authHeader);
}