import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CountryCode } from '../../domain/enums/country-code.enum';
import type { ClientSegment } from '../../domain/value-objects/client-segment.vo';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  companyName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone: string;

  @IsEmail()
  email: string;

  @IsIn(['vip', 'regular', 'new'])
  segment: ClientSegment;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(CountryCode)
  country: CountryCode;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
