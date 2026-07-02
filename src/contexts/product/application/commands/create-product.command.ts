/**
 * Command to create a new product.
 *
 * Carries the supplier's internal PK (resolved from session)
 * and all product fields provided by the client.
 */
export class CreateProductCommand {
  constructor(
    /** Internal PK of the owning supplier. */
    public readonly supplierId: number,
    /** Product creation payload. */
    public readonly input: {
      type: string;
      name: string;
      nameAr: string;
      sku?: string;
      description: string;
      descriptionAr: string;
      mainTitle: string;
      mainTitleAr: string;
      promotionalTitle: string;
      promotionalTitleAr: string;
      images?: string[];
      categoryId?: string;
      subcategoryId?: string;
      costPrice?: number;
      shippingPrice?: number;
      usePlatformShipping?: boolean;
      weightKg?: number;
      discountedPrice?: number;
      discountPercentage?: number;
      discountEndDate?: Date;
      stockQuantity?: number;
      maxPerCustomer?: number;
      trackInventory?: boolean;
      requiresShipping?: boolean;
      optionGroups?: { name: string; values: string[] }[];
      bookingAvailableTime?: string;
      bookingAvailableDate?: Date;
      bookingCapacity?: number;
      digitalFileUrl?: string;
      digitalFileType?: string;
      digitalFileSize?: string;
      bundlePrice?: number;
      unitType: string;
      unitTypeAr: string;
      variants?: {
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
