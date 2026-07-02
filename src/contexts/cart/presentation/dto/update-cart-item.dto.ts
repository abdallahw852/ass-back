import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCartItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  targetPrice?: number | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
