import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateCheckoutDto {
  @IsEnum(['pro', 'business'], { message: 'plan doit être "pro" ou "business"' })
  plan!: 'pro' | 'business';

  /** Email pré-rempli dans la page Lemon Squeezy (optionnel) */
  @IsOptional()
  @IsString()
  email?: string;
}
