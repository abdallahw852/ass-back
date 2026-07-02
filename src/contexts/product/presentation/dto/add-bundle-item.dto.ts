import { IsUUID } from 'class-validator';

/**
 * DTO for adding a child product to a bundle.
 */
export class AddBundleItemDto {
  @IsUUID('4', { message: 'childProductId must be a valid UUID.' })
  childProductId: string;
}
