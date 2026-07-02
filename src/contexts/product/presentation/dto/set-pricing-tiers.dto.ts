import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PricingTierItemDto {
  @IsInt()
  @Min(1)
  minQuantity: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  maxQuantity?: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class SetPricingTiersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PricingTierItemDto)
  tiers: PricingTierItemDto[];
}
