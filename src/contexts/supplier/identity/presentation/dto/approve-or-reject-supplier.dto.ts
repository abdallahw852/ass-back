import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ApproveOrRejectSupplierDto {
  @IsIn(['approve', 'reject'])
  @IsNotEmpty()
  decision: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
