import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ShippingDestinationDto {
  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsOptional()
  @IsString()
  line1?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsInt()
  torodCityId?: number;
}

class SelectedShippingOptionDto {
  @IsInt()
  courierPartnerId: number;

  @IsString()
  @IsNotEmpty()
  courierName: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  eta?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  isOwn?: boolean;
}

export class UpdateSupplierGroupDto {
  @IsOptional()
  @IsString()
  message?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingDestinationDto)
  shippingDestination?: ShippingDestinationDto | null;

  @IsOptional()
  @IsIn(['platform', 'supplier'])
  shippingMethod?: 'platform' | 'supplier';

  @IsOptional()
  @ValidateNested()
  @Type(() => SelectedShippingOptionDto)
  selectedShippingOption?: SelectedShippingOptionDto | null;
}
