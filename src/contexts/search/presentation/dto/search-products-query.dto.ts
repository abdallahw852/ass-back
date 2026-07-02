import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import type { SearchSort } from '../../domain/search.types';

const SORT_OPTIONS: SearchSort[] = [
  'relevance',
  'price_asc',
  'price_desc',
  'moq_asc',
  'moq_desc',
  'newest',
];

export class SearchProductsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @Transform(({ value }: { value: string | string[] }) =>
    Array.isArray(value) ? value : String(value).split(',').filter(Boolean),
  )
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @IsOptional()
  @Transform(({ value }: { value: string | string[] }) =>
    Array.isArray(value) ? value : String(value).split(',').filter(Boolean),
  )
  @IsArray()
  @Matches(/^[A-Z]{2}$/, { each: true })
  countries?: string[];

  @IsOptional()
  @Transform(({ value }: { value: string | string[] }) =>
    Array.isArray(value) ? value : String(value).split(',').filter(Boolean),
  )
  @IsArray()
  @IsString({ each: true })
  supplierTypes?: string[];

  @IsOptional()
  @Transform(({ value }: { value: string }) => value === 'true')
  @IsBoolean()
  verifiedOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  moqMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  moqMax?: number;

  @IsOptional()
  @IsIn(SORT_OPTIONS)
  sort?: SearchSort;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(60)
  limit?: number;

  @IsOptional()
  @Transform(({ value }: { value: string }) => value !== 'false')
  @IsBoolean()
  facets?: boolean;
}
