import { IsIn } from 'class-validator';
import { ProductStatus } from '../../domain/enums/product-status.enum';

/**
 * DTO for supplier-initiated product status changes.
 * Suppliers may only set status to inactive, active, or archived.
 */
export class UpdateProductStatusDto {
  @IsIn(
    [ProductStatus.INACTIVE, ProductStatus.ACTIVE, ProductStatus.ARCHIVED],
    {
      message:
        'Suppliers may only set status to inactive, active, or archived.',
    },
  )
  status: string;
}
