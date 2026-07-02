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
  ValidateNested,
} from 'class-validator';
import { plainToInstance, Transform, Type } from 'class-transformer';
import { ProductType } from '../../domain/enums/product-type.enum';
import { ProductCondition } from '../../domain/enums/product-condition.enum';
import { AddVariantDto } from './add-variant.dto';

export class AttributeDto {
  @IsString()
  @MaxLength(128)
  key: string;

  @IsString()
  @MaxLength(512)
  value: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  group?: string;
}

/** Embedded DTO for custom option groups (e.g. Material → [Leather, Cotton]). */
export class OptionGroupDto {
  @IsString()
  @MaxLength(128)
  name: string;

  @IsArray()
  @IsString({ each: true })
  values: string[];
}

/**
 * DTO for creating a new product.
 *
 * Only `type` and `name` are required; all other fields are optional
 * and vary by product type.
 */
export class CreateProductDto {
  @IsEnum(ProductType, { message: 'Invalid product type.' })
  type: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nameAr: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  sku?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  descriptionAr: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  mainTitle: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  mainTitleAr: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  promotionalTitle: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  promotionalTitleAr: string;

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

  // ── Buyer-facing fields ────────────────────────────────────

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

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unitType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unitTypeAr: string;

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

  // ── Service / Food booking fields ──────────────────────────

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

  // ── Digital product fields ─────────────────────────────────

  @IsOptional()
  @IsString()
  digitalFileType?: string;

  @IsOptional()
  @IsString()
  digitalFileSize?: string;

  // ── Bundle fields ──────────────────────────────────────────

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bundlePrice?: number;

  // ── Inline variants ────────────────────────────────────────
  // Send as a JSON string when using multipart/form-data,
  // or as a nested array when using application/json.

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed)
          ? plainToInstance(AddVariantDto, parsed)
          : parsed;
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddVariantDto)
  variants?: AddVariantDto[];

  // ── Inline bundle items (child product UUIDs) ─────────────

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
}
