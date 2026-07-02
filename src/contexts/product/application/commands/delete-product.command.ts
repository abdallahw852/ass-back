/**
 * Command to delete a product.
 *
 * Cascades to variants and bundle items via database FK constraints.
 */
export class DeleteProductCommand {
  constructor(
    /** Public UUID of the product to delete. */
    public readonly productId: string,
    /** Internal PK of the requesting supplier (for ownership check). */
    public readonly supplierId: number,
  ) {}
}
