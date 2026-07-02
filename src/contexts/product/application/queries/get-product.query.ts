/**
 * Query to retrieve a single product by its public UUID.
 *
 * Eager-loads variants and bundle items.
 */
export class GetProductQuery {
  constructor(
    /** Public UUID of the product. */
    public readonly productId: string,
    /** Internal PK of the requesting supplier — enforces ownership. */
    public readonly supplierId: number,
  ) {}
}
