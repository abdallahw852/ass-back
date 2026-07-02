import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RefundReturnDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;
}
