import {
  Allow,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { IsPasswordPolicyCompliant } from '../../../../shared/validators/is-password-policy-compliant.validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email: string;

  @IsString()
  @IsPasswordPolicyCompliant()
  password: string;

  @IsIn(['buyer', 'supplier'], {
    message: 'Account type must be either "buyer" or "supplier".',
  })
  accountType: 'buyer' | 'supplier';

  @IsString()
  @Length(2, 100, { message: 'Name must be between 2 and 100 characters.' })
  name: string;

  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'Please enter a valid phone number.',
  })
  phone: string;

  @IsOptional()
  @Allow()
  avatar?: unknown;
}
