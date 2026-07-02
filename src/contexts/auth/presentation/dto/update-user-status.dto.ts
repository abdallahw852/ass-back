import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateUserStatusDto {
  @IsIn(['active', 'suspended'])
  @IsNotEmpty()
  status: 'active' | 'suspended';

  @IsOptional()
  @IsString()
  reason?: string;
}
