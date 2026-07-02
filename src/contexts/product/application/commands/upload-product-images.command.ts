/**
 * Command to upload and attach images to a product.
 *
 * Image URLs are pre-resolved by the controller via StorageService
 * and passed here as an array of URL strings.
 */
export class UploadProductImagesCommand {
  constructor(
    /** Public UUID of the product. */
    public readonly productId: string,
    /** Internal PK of the requesting supplier (for ownership check). */
    public readonly supplierId: number,
    /** Array of stored image URLs to append to the product. */
    public readonly imageUrls: string[],
  ) {}
}
