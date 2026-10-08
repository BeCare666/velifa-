import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class SendReportEmailDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string = '';
}
