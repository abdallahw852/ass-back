/**
 * Command to update an existing product variant.
 */
export class UpdateVariantCommand {
  constructor(
    /** Public UUID of the variant to update. */
    public readonly variantId: string,
    /** Internal PK of the requesting supplier (for ownership check). */
    public readonly supplierId: number,
    /** Partial update payload. */
    public readonly input: {
      sku?: string;
      price?: number;
      quantity?: number;
      isActive?: boolean;
    },
  ) {}
}
