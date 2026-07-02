import { IsOptional, IsIn } from 'class-validator';

export class SupplierStatsFilterDto {
  @IsOptional()
  @IsIn(['week', 'month', 'year'])
  period?: 'week' | 'month' | 'year';
}
