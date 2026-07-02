import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { plainToInstance, Transform, Type } from 'class-transformer';
import { AttributeDto, OptionGroupDto } from './create-product.dto';
import { AddVariantDto } from './add-variant.dto';
import { ProductStatus } from '../../domain/enums/product-status.enum';
import { ProductCondition } from '../../domain/enums/product-condition.enum';

/** Variant entry in the inline variants replacement array. Extends {@link AddVariantDto} with an optional stable identity field. */
export class UpdateProductVariantItemDto extends AddVariantDto {
  @IsOptional()
  @IsUUID('4')
  id?: string;
}

/**
 * DTO for partially updating a product.
 *
 * All fields are optional — only supplied fields will be updated.
 */
export class UpdateProductDto {
  @ValidateIf((o: UpdateProductDto) => o.nameAr !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ValidateIf((o: UpdateProductDto) => o.name !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nameAr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  sku?: string;

  @ValidateIf((o: UpdateProductDto) => o.descriptionAr !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description?: string;

  @ValidateIf((o: UpdateProductDto) => o.description !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  descriptionAr?: string;

  @ValidateIf((o: UpdateProductDto) => o.mainTitleAr !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  mainTitle?: string;

  @ValidateIf((o: UpdateProductDto) => o.mainTitle !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  mainTitleAr?: string;

  @ValidateIf((o: UpdateProductDto) => o.promotionalTitleAr !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  promotionalTitle?: string;

  @ValidateIf((o: UpdateProductDto) => o.promotionalTitle !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  promotionalTitleAr?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subcategoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shippingPrice?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  usePlatformShipping?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountedPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  discountPercentage?: number;

  @IsOptional()
  @IsDateString()
  discountEndDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPerCustomer?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  trackInventory?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  requiresShipping?: boolean;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed)
          ? plainToInstance(OptionGroupDto, parsed)
          : parsed;
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionGroupDto)
  optionGroups?: OptionGroupDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  moq?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitCount?: number;

  @ValidateIf((o: UpdateProductDto) => o.unitTypeAr !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unitType?: string;

  @ValidateIf((o: UpdateProductDto) => o.unitType !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unitTypeAr?: string;

  @IsOptional()
  @IsEnum(ProductCondition, { message: 'Invalid product condition.' })
  condition?: ProductCondition;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed)
          ? plainToInstance(AttributeDto, parsed)
          : parsed;
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeDto)
  attributes?: AttributeDto[];

  @IsOptional()
  @IsString()
  bookingAvailableTime?: string;

  @IsOptional()
  @IsDateString()
  bookingAvailableDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bookingCapacity?: number;

  @IsOptional()
  @IsString()
  digitalFileType?: string;

  @IsOptional()
  @IsString()
  digitalFileSize?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bundlePrice?: number;

  // ── Inline variants (full replacement) ────────────────────

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    const parsed =
      typeof value === 'string'
        ? (() => {
            try {
              return JSON.parse(value) as unknown;
            } catch {
              return value;
            }
          })()
        : value;
    return Array.isArray(parsed)
      ? plainToInstance(UpdateProductVariantItemDto, parsed)
      : parsed;
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductVariantItemDto)
  variants?: UpdateProductVariantItemDto[];

  // ── Inline bundle items (full replacement, child UUIDs) ───

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsArray()
  @IsUUID('4', {
    each: true,
    message: 'Each bundle item must be a valid UUID.',
  })
  bundleItems?: string[];

  // ── Status ────────────────────────────────────────────────

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
