import { IsString, Length, Matches } from 'class-validator';

export class ConfirmEmailChangeDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  otpCode: string;
}
