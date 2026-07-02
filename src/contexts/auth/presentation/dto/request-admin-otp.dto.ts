import { IsEmail } from 'class-validator';

export class RequestAdminOtpDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email: string;
}
