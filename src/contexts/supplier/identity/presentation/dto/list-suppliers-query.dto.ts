import {
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SupplierType } from '../../domain/enums/supplier-type.enum';

export class ListSuppliersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(SupplierType, { each: true })
  @Transform(({ value }: { value: string | string[] }) =>
    Array.isArray(value) ? value : [value],
  )
  supplierTypes?: SupplierType[];

  @IsOptional()
  @IsArray()
  @Matches(/^[A-Z]{2}$/, {
    each: true,
    message: 'Each country must be an ISO-2 code (e.g. SA, AE)',
  })
  @Transform(({ value }: { value: string | string[] }) =>
    Array.isArray(value) ? value : [value],
  )
  countries?: string[];

  @IsOptional()
  @IsIn(['gulf'])
  region?: 'gulf';

  @IsOptional()
  @Transform(({ value }: { value: string }) => value === 'true')
  verifiedOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(60)
  limit: number = 20;

  @IsOptional()
  @IsIn(['createdAt', 'companyName', 'yearEstablished'])
  sort?: 'createdAt' | 'companyName' | 'yearEstablished';
}
