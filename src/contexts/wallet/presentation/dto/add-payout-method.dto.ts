import { IsString, MaxLength } from 'class-validator';

export class AddPayoutMethodDto {
  @IsString({ message: 'type is required.' })
  @MaxLength(32, { message: 'type must not exceed 32 characters.' })
  type: string;

  @IsString({ message: 'bankName is required.' })
  @MaxLength(128, { message: 'bankName must not exceed 128 characters.' })
  bankName: string;

  @IsString({ message: 'accountName is required.' })
  @MaxLength(128, { message: 'accountName must not exceed 128 characters.' })
  accountName: string;

  @IsString({ message: 'iban is required.' })
  @MaxLength(64, { message: 'iban must not exceed 64 characters.' })
  iban: string;
}
