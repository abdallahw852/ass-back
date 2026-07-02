import { IsNotEmpty, IsString } from 'class-validator';

export class UpgradeDto {
  @IsString()
  @IsNotEmpty()
  planId: string;
}
