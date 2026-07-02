import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteSupplierProfileDto {
  @IsOptional()
  @IsString({ message: 'Company name (Arabic) must be a text value.' })
  @MaxLength(255, {
    message: 'Company name (Arabic) must not exceed 255 characters.',
  })
  companyNameAr?: string;

  @IsOptional()
  @IsString({ message: 'Company name (English) must be a text value.' })
  @MaxLength(255, {
    message: 'Company name (English) must not exceed 255 characters.',
  })
  companyNameEn?: string;

  @IsOptional()
  @IsString({ message: 'Tax number must be a text value.' })
  @MaxLength(64, { message: 'Tax number must not exceed 64 characters.' })
  taxNumber?: string;

  @IsOptional()
  @IsString({ message: 'Owner name must be a text value.' })
  @MaxLength(255, { message: 'Owner name must not exceed 255 characters.' })
  ownerName?: string;

  @IsOptional()
  @IsString({ message: 'National ID must be a text value.' })
  @MaxLength(32, { message: 'National ID must not exceed 32 characters.' })
  nationalId?: string;

  @IsOptional()
  @IsString({ message: 'City must be a text value.' })
  @MaxLength(128, { message: 'City must not exceed 128 characters.' })
  city?: string;

  @IsOptional()
  @IsString({ message: 'Detailed address must be a text value.' })
  detailedAddress?: string;

  @IsOptional()
  @IsString({ message: 'Bank name must be a text value.' })
  @MaxLength(255, { message: 'Bank name must not exceed 255 characters.' })
  bankName?: string;

  @IsOptional()
  @IsString({ message: 'IBAN must be a text value.' })
  @MaxLength(64, { message: 'IBAN must not exceed 64 characters.' })
  iban?: string;

  @IsOptional()
  @IsString({ message: 'Account holder name must be a text value.' })
  @MaxLength(255, {
    message: 'Account holder name must not exceed 255 characters.',
  })
  accountHolderName?: string;

  @IsOptional()
  @IsString({ message: 'Business description must be a text value.' })
  @MaxLength(500, {
    message: 'Business description must not exceed 500 characters.',
  })
  businessDescription?: string;
}
