import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsInt() @Min(1)
  PORT: number = 3001;

  @IsString() FRONTEND_URL: string = 'http://localhost:3000';
  @IsOptional() @IsString() APP_URL?: string;
  @IsString() DATABASE_URL: string = '';
  @IsString() REDIS_URL: string = 'redis://localhost:6379';
  @IsString() PAGESPEED_API_KEY: string = '';
  @IsString() BROWSERLESS_API_KEY: string = '';
  @IsString() BROWSERLESS_URL: string = 'https://chrome.browserless.io';
  @IsString() CLOUDINARY_CLOUD_NAME: string = '';
  @IsString() CLOUDINARY_API_KEY: string = '';
  @IsString() CLOUDINARY_API_SECRET: string = '';
  @IsString() BREVO_API_KEY: string = '';
  @IsInt()    BREVO_TEMPLATE_ID: number = 1;
  @IsString() BREVO_FROM_EMAIL: string = '';
  @IsString() BREVO_FROM_NAME: string = 'VELIFA';
  @IsString() WHATSAPP_NUMBER: string = '';
  @IsString() TURNSTILE_SECRET_KEY: string = '';
  @IsString() JWT_SECRET: string = '';
  @IsOptional() @IsString() CLERK_SECRET_KEY?: string;
  @IsOptional() @IsString() SENTRY_DSN?: string;
  @IsOptional() @IsString() LEMONSQUEEZY_API_KEY?: string;
  @IsOptional() @IsString() LEMONSQUEEZY_STORE_ID?: string;
  @IsOptional() @IsString() LEMONSQUEEZY_PRO_VARIANT_ID?: string;
  @IsOptional() @IsString() LEMONSQUEEZY_BUSINESS_VARIANT_ID?: string;
  @IsOptional() @IsString() LEMONSQUEEZY_WEBHOOK_SECRET?: string;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Config validation error:\n${errors.toString()}`);
  }
  return validated;
}

export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  // APP_URL prend la priorité sur FRONTEND_URL (plus explicite en prod)
  frontendUrl:
    process.env.APP_URL ??
    process.env.FRONTEND_URL ??
    'http://localhost:3000',
  database:    { url: process.env.DATABASE_URL ?? '' },
  redis:       { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
  pagespeed:   { apiKey: process.env.PAGESPEED_API_KEY ?? '' },
  browserless: {
    apiKey: process.env.BROWSERLESS_API_KEY ?? '',
    url:    process.env.BROWSERLESS_URL ?? 'https://chrome.browserless.io',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey:    process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  },
  brevo: {
    apiKey:     process.env.BREVO_API_KEY ?? '',
    templateId: parseInt(process.env.BREVO_TEMPLATE_ID ?? '1', 10),
    fromEmail:  process.env.BREVO_FROM_EMAIL ?? '',
    fromName:   process.env.BREVO_FROM_NAME ?? 'VELIFA',
  },
  whatsapp: { number: process.env.WHATSAPP_NUMBER ?? '' },
  security: {
    turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY ?? '',
    jwtSecret:          process.env.JWT_SECRET ?? '',
  },
  clerk: {
    secretKey: process.env.CLERK_SECRET_KEY ?? '',
  },
  sentry: { dsn: process.env.SENTRY_DSN ?? '' },
  lemonSqueezy: {
    apiKey:
      process.env.LEMONSQUEEZY_API_KEY ??
      process.env.NEXT_PUBLIC_LEMONSQUEEZY_API_KEY ?? '',
    storeId:
      process.env.LEMONSQUEEZY_STORE_ID ??
      process.env.NEXT_PUBLIC_LEMONSQUEEZY_STORE_ID ?? '',
    proVariantId:
      process.env.LEMONSQUEEZY_PRO_VARIANT_ID ??
      process.env.NEXT_PUBLIC_LEMONSQUEEZY_PRO_VARIANT_ID ?? '',
    businessVariantId:
      process.env.LEMONSQUEEZY_BUSINESS_VARIANT_ID ??
      process.env.NEXT_PUBLIC_LEMONSQUEEZY_BUSINESS_VARIANT_ID ?? '',
    webhookSecret:
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET ??
      process.env.NEXT_PUBLIC_LEMONSQUEEZY_WEBHOOK_SECRET ?? '',
  },
});
