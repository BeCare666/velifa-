import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as helmet from 'helmet';
import { AppModule } from './app.module';

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
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

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
