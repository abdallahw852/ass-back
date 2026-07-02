import { StorageService } from '../../../shared/infrastructure/services/storage.service';
import type {
  CatalogProductCard,
  CatalogProductDetail,
} from '../infrastructure/repositories/catalog.repository';

export class CatalogFormatter {
  static async card(
    raw: CatalogProductCard,
    storage: StorageService,
  ): Promise<Record<string, unknown>> {
    const images = await Promise.all(
      (raw.images ?? []).map((url) => storage.getSignedUrl({ url })),
    );

    const logoUrl = raw.supplierLogoUrl
      ? await storage.getSignedUrl({ url: raw.supplierLogoUrl })
      : null;

    return {
      id: raw._id,
      name: raw.name,
      mainTitle: raw.mainTitle,
      promotionalTitle: raw.promotionalTitle,
      images,
      type: raw.type,
      costPrice: raw.costPrice,
      shippingPrice: raw.shippingPrice,
      discountedPrice: raw.discountedPrice,
      discountPercentage: raw.discountPercentage,
      currency: raw.currency,
      moq: raw.moq,
      unitCount: raw.unitCount,
      unitType: raw.unitType,
      condition: raw.condition,
      categoryId: raw.categoryId,
      subcategoryId: raw.subcategoryId,
      viewCount: raw.viewCount,
      reviewAvgRating: raw.reviewAvgRating,
      reviewCount: raw.reviewCount,
      supplier: {
        id: raw.supplierPublicId,
        companyName: raw.supplierCompanyName,
        country: raw.supplierCountry,
        logoUrl,
        isVerified: raw.supplierIsVerified,
        yearsInBusiness: raw.supplierYearsInBusiness,
      },
      createdAt: raw.createdAt,
    };
  }

  static async detail(
    raw: CatalogProductDetail,
    storage: StorageService,
  ): Promise<Record<string, unknown>> {
    return {
      ...(await CatalogFormatter.card(raw, storage)),
      description: raw.description,
      stockQuantity: raw.stockQuantity,
      requiresShipping: raw.requiresShipping,
      optionGroups: raw.optionGroups,
      attributes: raw.attributes,
      variants: raw.variants.map((v) => ({
        id: v._id,
        sku: v.sku,
        color: v.color,
        size: v.size,
        price: v.price,
        quantity: v.quantity,
        isActive: v.isActive,
      })),
    };
  }

  static async list(
    raw: {
      items: CatalogProductCard[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    },
    storage: StorageService,
  ): Promise<Record<string, unknown>> {
    return {
      items: await Promise.all(
        raw.items.map((item) => CatalogFormatter.card(item, storage)),
      ),
      total: raw.total,
      page: raw.page,
      limit: raw.limit,
      totalPages: raw.totalPages,
    };
  }
}
