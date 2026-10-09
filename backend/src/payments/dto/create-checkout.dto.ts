import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateCheckoutDto {
  @IsEnum(['pro', 'business'], { message: 'plan doit être "pro" ou "business"' })
  plan!: 'pro' | 'business';

  /** Email pré-rempli dans la page Lemon Squeezy (optionnel) */
  @IsOptional()
  @IsString()
  email?: string;

  /** Facturation mensuelle (défaut) ou annuelle (si une variante annuelle est configurée). */
  @IsOptional()
  @IsEnum(['monthly', 'yearly'], { message: 'billing doit être "monthly" ou "yearly"' })
  billing?: 'monthly' | 'yearly';
}
