/**
 * Command to remove a child product from a bundle/group product.
 */
export class RemoveBundleItemCommand {
  constructor(
    /** Public UUID of the parent bundle product. */
    public readonly productId: string,
    /** Internal PK of the requesting supplier (for ownership check). */
    public readonly supplierId: number,
    /** Public UUID of the child product to remove. */
    public readonly childProductId: string,
  ) {}
}
