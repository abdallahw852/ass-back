import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class FileReturnRequestDto {
  @IsUUID('4')
  orderId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason: string;
}
