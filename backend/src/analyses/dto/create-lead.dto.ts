import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trimOrUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

/** POST /analyses/:id/lead — au moins un email ou un téléphone (vérifié dans le service). */
export class CreateLeadDto {
  @IsOptional() @IsString() @MaxLength(120)
  @Transform(trimOrUndefined)
  name?: string;

  @IsOptional() @IsEmail() @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : undefined))
  email?: string;

  @IsOptional() @IsString() @MaxLength(32)
  @Transform(trimOrUndefined)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  @Transform(trimOrUndefined)
  message?: string;

  /** Obligatoire pour les visiteurs anonymes (vérifié dans le service). */
  @IsOptional() @IsString() @MaxLength(4096)
  cfTurnstileToken?: string;
}
