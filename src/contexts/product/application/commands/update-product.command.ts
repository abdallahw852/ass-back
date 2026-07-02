/**
 * Command to update an existing product.
 *
 * Only the fields provided in `input` will be updated;
 * omitted fields remain unchanged.
 */
export class UpdateProductCommand {
  constructor(
    /** Public UUID of the product to update. */
    public readonly productId: string,
    /** Internal PK of the requesting supplier (for ownership check). */
    public readonly supplierId: number,
    /** Partial update payload. */
    public readonly input: {
      name?: string;
      nameAr?: string | null;
      sku?: string;
      description?: string;
      descriptionAr?: string | null;
      mainTitle?: string;
      mainTitleAr?: string | null;
      promotionalTitle?: string;
      promotionalTitleAr?: string | null;
      images?: string[];
      categoryId?: string;
      subcategoryId?: string;
      costPrice?: number;
      shippingPrice?: number;
      usePlatformShipping?: boolean;
      weightKg?: number | null;
      discountedPrice?: number;
      discountPercentage?: number;
      discountEndDate?: Date | null;
      stockQuantity?: number;
      maxPerCustomer?: number;
      trackInventory?: boolean;
      requiresShipping?: boolean;
      optionGroups?: { name: string; values: string[] }[];
      bookingAvailableTime?: string;
      bookingAvailableDate?: Date | null;
      bookingCapacity?: number;
      digitalFileUrl?: string;
      digitalFileType?: string;
      digitalFileSize?: string;
      bundlePrice?: number;
      unitTypeAr?: string | null;
      variants?: {
        id?: string;
        color?: string;
        size?: string;
        sizeAr?: string;
        sku?: string;
        price: number;
        quantity?: number;
        isActive?: boolean;
      }[];
      bundleItems?: string[];
      status?: string;
    },
  ) {}
}
