import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CountryCode } from '../../domain/enums/country-code.enum';

export class ListClientsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['all', 'active', 'inactive'])
  status?: 'all' | 'active' | 'inactive';

  @IsOptional()
  @IsIn(['all', 'VIP', 'PERMANENT', 'NEW', 'AUTHORIZED_AGENT'])
  classification?: 'all' | 'VIP' | 'PERMANENT' | 'NEW' | 'AUTHORIZED_AGENT';

  @IsOptional()
  @IsEnum(CountryCode)
  country?: CountryCode;

  @IsOptional()
  @IsIn(['all', '7d', '30d', '3mo', '1y'])
  dateAdded?: '7d' | '30d' | '3mo' | '1y' | 'all';

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
