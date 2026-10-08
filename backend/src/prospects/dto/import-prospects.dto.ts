import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PROSPECT_LOCALES, ProspectLocale } from '../prospects.service';

export class ImportProspectsDto {
  /** Contenu du fichier CSV (texte). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(90_000) // sous la limite JSON par défaut d'Express (100 Ko)
  csv: string = '';

  /** Langue des rapports et du message WhatsApp. */
  @IsOptional()
  @IsIn(PROSPECT_LOCALES as unknown as string[])
  locale?: ProspectLocale;
}
