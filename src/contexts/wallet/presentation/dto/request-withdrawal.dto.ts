import { IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class RequestWithdrawalDto {
  @IsNumber({}, { message: 'amount must be a number.' })
  @Min(1, { message: 'amount must be at least 1.' })
  amount: number;

  @IsString({ message: 'payoutMethodId is required.' })
  @IsUUID('4', { message: 'payoutMethodId must be a valid UUID.' })
  payoutMethodId: string;
}
