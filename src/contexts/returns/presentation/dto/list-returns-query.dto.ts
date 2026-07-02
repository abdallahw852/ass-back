import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListReturnsQueryDto {
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected', 'refunded'])
  status?: 'pending' | 'approved' | 'rejected' | 'refunded';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
