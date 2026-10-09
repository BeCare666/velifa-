import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddSiteDto {
  @IsString() @IsNotEmpty() @MaxLength(2048)
  url: string = '';

  @IsOptional() @IsString() @MaxLength(120)
  label?: string;

  /** Absent = site personnel ; sinon espace agence dont l'appelant est membre. */
  @IsOptional() @IsString() @MaxLength(36)
  workspaceId?: string;
}
