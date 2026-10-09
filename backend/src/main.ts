import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as helmet from 'helmet';
import { AppModule } from './app.module';
import { corsOptionsFor } from './common/security/cors';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    rawBody: true,   // Required for Lemon Squeezy webhook signature verification
  });

  const config = app.get(ConfigService);
  const port        = config.get<number>('port', 3001);
  const frontendUrl = config.get<string>('frontendUrl', 'http://localhost:3000');
  const nodeEnv     = config.get<string>('nodeEnv', 'development');

  // ── Security ───────────────────────────────────────────────────────────────
  app.use((helmet as any)({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: nodeEnv === 'production',
  }));

  // Origines autorisées : frontendUrl (APP_URL ou FRONTEND_URL) + localhost:3000 dev
  const allowedOrigins = Array.from(new Set([
    frontendUrl,
    'http://localhost:3000',
    'http://localhost:3001',
  ]));
  // Widget agence : CORS ouvert sur /widget/* uniquement (voir common/security/cors.ts)
  app.enableCors((req: any, callback: (err: Error | null, options: any) => void) =>
    callback(null, corsOptionsFor(req.originalUrl ?? req.url ?? '', allowedOrigins)));

  // ── Global pipes ───────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:        true,    // Strip unknown fields
      forbidNonWhitelisted: true,
      transform:        true,    // Auto-transform types
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global prefix ─────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  await app.listen(port);
  logger.log(`VELIFA API running on http://localhost:${port}/api/v1`);
  logger.log(`Environment: ${nodeEnv}`);
}

bootstrap();
