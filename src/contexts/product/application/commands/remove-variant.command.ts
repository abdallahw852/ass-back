/**
 * Command to remove a product variant.
 */
export class RemoveVariantCommand {
  constructor(
    /** Public UUID of the variant to remove. */
    public readonly variantId: string,
    /** Internal PK of the requesting supplier (for ownership check). */
    public readonly supplierId: number,
  ) {}
}
