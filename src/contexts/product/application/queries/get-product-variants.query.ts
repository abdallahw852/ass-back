/**
 * Query to retrieve all variants belonging to a product.
 */
export class GetProductVariantsQuery {
  constructor(
    /** Public UUID of the product. */
    public readonly productId: string,
    /** Internal PK of the requesting supplier — enforces ownership. */
    public readonly supplierId: number,
  ) {}
}
