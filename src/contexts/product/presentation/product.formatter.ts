import { StorageService } from '../../../shared/infrastructure/services/storage.service';

export class ProductFormatter {
  static variant(raw: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {
      id: raw._id as string,
      price: raw.price,
      quantity: raw.quantity,
      isActive: raw.isActive,
    };
    if (raw.sku != null) result.sku = raw.sku;
    if (raw.color != null) result.color = raw.color;
    if (raw.size != null) result.size = raw.size;
    return result;
  }

  static bundleItem(raw: Record<string, unknown>): Record<string, unknown> {
    return {
      id: raw._id as string,
      childProductId: raw.childProductId as string,
    };
  }

  static async product(
    raw: Record<string, unknown>,
    storage: StorageService,
  ): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = { id: raw._id };

    for (const [k, v] of Object.entries(raw)) {
      if (k === '_id') continue;
      if (k === 'variants') {
        result.variants = ((v ?? []) as Record<string, unknown>[]).map((item) =>
          ProductFormatter.variant(item),
        );
      } else if (k === 'bundleItems') {
        result.bundleItems = ((v ?? []) as Record<string, unknown>[]).map(
          (item) => ProductFormatter.bundleItem(item),
        );
      } else if (k === 'images') {
        result.images = await Promise.all(
          ((v ?? []) as string[]).map((url) => storage.getSignedUrl({ url })),
        );
      } else if (k === 'digitalFileUrl') {
        result.digitalFileUrl = v
          ? await storage.getSignedUrl({ url: v as string })
          : null;
      } else {
        result[k] = v;
      }
    }

    return result;
  }

  static async list(
    raw: {
      items: Record<string, unknown>[];
      total: number;
      page: number;
      limit: number;
    },
    storage: StorageService,
  ): Promise<Record<string, unknown>> {
    return {
      items: await Promise.all(
        raw.items.map((item) => ProductFormatter.product(item, storage)),
      ),
      total: raw.total,
      page: raw.page,
      limit: raw.limit,
    };
  }
}
