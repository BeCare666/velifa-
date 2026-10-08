import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAnalysisDto {
  @IsUrl({ protocols: ['https', 'http'], require_tld: true })
  @IsNotEmpty()
  @MaxLength(2048)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  url: string = '';

  /** Email optionnel — fourni si l'utilisateur est connecté ou l'a saisi */
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim()
      ? value.trim().toLowerCase()
      : undefined,
  )
  email?: string;

  @IsString()
  @IsNotEmpty()
  cfTurnstileToken: string = '';

  @IsString()
  @IsOptional()
  locale?: string = 'fr';

  @IsOptional()
  @IsBoolean()
  force?: boolean = false;
}
