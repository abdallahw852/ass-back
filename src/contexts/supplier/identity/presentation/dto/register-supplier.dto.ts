import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterSupplierDto {
  @IsString({ message: 'Company name is required.' })
  @MaxLength(255, { message: 'Company name must not exceed 255 characters.' })
  companyName: string;

  @IsString({ message: 'Phone number is required.' })
  @MaxLength(32, { message: 'Phone number must not exceed 32 characters.' })
  phoneNumber: string;

  @IsString({ message: 'Country is required.' })
  @MaxLength(64, { message: 'Country must not exceed 64 characters.' })
  country: string;

  @IsString({ message: 'Activity type is required.' })
  @MaxLength(128, { message: 'Activity type must not exceed 128 characters.' })
  activityType: string;

  @IsString({ message: 'Business size is required.' })
  @MaxLength(64, { message: 'Business size must not exceed 64 characters.' })
  businessSize: string;

  @IsString({ message: 'Registration number is required.' })
  @MaxLength(128, {
    message: 'Registration number must not exceed 128 characters.',
  })
  registrationNumber: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a text value.' })
  notes?: string;
}
