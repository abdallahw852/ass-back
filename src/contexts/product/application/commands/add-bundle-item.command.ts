/**
 * Command to add a child product to a bundle/group product.
 */
export class AddBundleItemCommand {
  constructor(
    /** Public UUID of the parent bundle product. */
    public readonly productId: string,
    /** Internal PK of the requesting supplier (for ownership check). */
    public readonly supplierId: number,
    /** Public UUID of the child product to add to the bundle. */
    public readonly childProductId: string,
  ) {}
}
