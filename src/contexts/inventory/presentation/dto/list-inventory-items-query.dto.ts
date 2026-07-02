import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { InventoryStatusFilter } from '../../application/queries/list-inventory-items.query';

export class ListInventoryItemsQueryDto {
  @IsOptional()
  @IsEnum(['all', 'available', 'low', 'out'])
  status?: InventoryStatusFilter;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
