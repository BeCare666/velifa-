import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class AddSiteDto {
  @IsString() @IsNotEmpty() @MaxLength(2048)
  url: string = '';

  @IsOptional() @IsString() @MaxLength(120)
  label?: string;

  /** Absent = site personnel ; sinon espace agence dont l'appelant est membre. */
  @IsOptional() @IsString() @MaxLength(36)
  workspaceId?: string;
}

export class SiteMonitoringDto {
  @IsOptional() @IsIn(['off', 'daily', 'weekly'])
  schedule?: string;

  /** null = pas d'alerte. */
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt() @Min(1) @Max(100)
  alertThreshold?: number | null;

  @IsOptional() @IsIn(['ar', 'en', 'fr'])
  locale?: string;
}
