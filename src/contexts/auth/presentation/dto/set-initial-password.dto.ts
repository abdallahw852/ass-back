import { IsString } from 'class-validator';
import { IsPasswordPolicyCompliant } from '../../../../shared/validators/is-password-policy-compliant.validator';

export class SetInitialPasswordDto {
  @IsString()
  passwordSetupToken: string;

  @IsString()
  @IsPasswordPolicyCompliant()
  password: string;
}
