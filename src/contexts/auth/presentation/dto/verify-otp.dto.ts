import { IsEmail, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email: string;

  @Length(4, 10, {
    message: 'Verification code must be between 4 and 10 characters.',
  })
  code: string;
}
