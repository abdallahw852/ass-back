import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CustomizationItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  value: string;
}
