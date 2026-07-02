/**
 * Command to add a new variant (colour/size SKU) to a product.
 */
export class AddVariantCommand {
  constructor(
    /** Public UUID of the parent product. */
    public readonly productId: string,
    /** Internal PK of the requesting supplier (for ownership check). */
    public readonly supplierId: number,
    /** Variant payload. */
    public readonly input: {
      color?: string;
      size?: string;
      sizeAr?: string;
      sku?: string;
      price: number;
      quantity?: number;
      isActive?: boolean;
    },
  ) {}
}
