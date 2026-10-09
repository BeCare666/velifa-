import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class WidgetConfigDto {
  @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(255, { each: true })
  origins: string[] = [];

  @IsOptional() @IsBoolean()
  regenerateKey?: boolean;
}

export class WidgetAuditDto {
  @IsString() @IsNotEmpty() @MaxLength(2048)
  url: string = '';

  @IsOptional() @IsString() @MaxLength(120)
  name?: string;

  @IsOptional() @IsString() @MaxLength(255)
  email?: string;

  @IsOptional() @IsString() @MaxLength(32)
  phone?: string;

  @IsOptional() @IsIn(['ar', 'en', 'fr'])
  locale?: string;
}
