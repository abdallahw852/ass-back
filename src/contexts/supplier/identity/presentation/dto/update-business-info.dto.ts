import {
  Allow,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MaxCurrentYear } from '../../../../../shared/validators/max-current-year.validator';

export class UpdateBusinessInfoDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  taxNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  activityType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  businessSize?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @MaxCurrentYear()
  yearEstablished?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  detailedAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  businessDescription?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @Allow()
  logo?: unknown;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  removeLogo?: boolean;
}
