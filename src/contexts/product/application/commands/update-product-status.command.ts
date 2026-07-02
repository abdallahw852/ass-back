/**
 * Command to change a product's status (draft → active, active → inactive, etc.).
 */
export class UpdateProductStatusCommand {
  constructor(
    /** Public UUID of the product. */
    public readonly productId: string,
    /** Internal PK of the requesting supplier (for ownership check). */
    public readonly supplierId: number,
    /** New status value. */
    public readonly status: string,
  ) {}
}
