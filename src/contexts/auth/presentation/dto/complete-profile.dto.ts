import { IsString, Length, Matches } from 'class-validator';

export class CompleteProfileDto {
  @IsString()
  @Length(2, 100, { message: 'Name must be between 2 and 100 characters.' })
  name: string;

  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'Please enter a valid phone number.',
  })
  phone: string;
}
