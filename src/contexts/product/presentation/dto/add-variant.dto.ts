import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * DTO for adding a variant (colour/size SKU) to a product.
 */
export class AddVariantDto {
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @ValidateIf((o: AddVariantDto) => !!o.sizeAr)
  @IsNotEmpty({ message: 'size is required when sizeAr is provided.' })
  @IsString()
  @MaxLength(32)
  size?: string;

  @ValidateIf((o: AddVariantDto) => !!o.size)
  @IsNotEmpty({ message: 'sizeAr is required when size is provided.' })
  @IsString()
  @MaxLength(32)
  sizeAr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  sku?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}
