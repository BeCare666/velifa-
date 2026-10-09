import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/** Création / mise à jour de la marque d'un espace agence (règles détaillées dans validateBranding). */
export class WorkspaceBrandingDto {
  @IsOptional() @IsString() @MaxLength(80)
  name?: string;

  @IsOptional() @IsString() @MaxLength(2048)
  logoUrl?: string;

  @IsOptional() @IsString() @MaxLength(7)
  brandColor?: string;

  @IsOptional() @IsString() @MaxLength(5)
  defaultLocale?: string;
}

export class AddMemberDto {
  @IsEmail() @MaxLength(255)
  email: string = '';
}
