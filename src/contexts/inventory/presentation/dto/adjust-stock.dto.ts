import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { StockMovementReason } from '../../domain/enums/stock-movement-reason.enum';

export class AdjustStockDto {
  @IsInt()
  value: number;

  @IsEnum(StockMovementReason)
  reason: StockMovementReason;

  @IsOptional()
  @IsString()
  note?: string;
}
