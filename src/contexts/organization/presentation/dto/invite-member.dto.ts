import { IsArray, IsEmail, IsString, MinLength } from 'class-validator';

export class InviteMemberDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  jobRole: string;

  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
