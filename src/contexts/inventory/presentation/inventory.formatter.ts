import { StorageService } from '../../../shared/infrastructure/services/storage.service';
import type {
  InventoryListRow,
  InventoryDetailRow,
} from '../infrastructure/repositories/inventory-item-read.repository';

export class InventoryFormatter {
  static async item(
    raw: InventoryListRow,
    storage: StorageService,
  ): Promise<Record<string, unknown>> {
    const thumbnail =
      raw.images.length > 0
        ? await storage.getSignedUrl({ url: raw.images[0] })
        : null;

    return {
      id: raw._id,
      sku: raw.sku,
      onHand: raw.onHand,
      minStockThreshold: raw.minStockThreshold,
      status: raw.status,
      unitPrice: raw.unitPrice,
      currency: raw.currency,
      productName: raw.productName,
      thumbnail,
      categoryId: raw.categoryId,
      lastMovementAt: raw.lastMovementAt,
      updatedAt: raw.updatedAt,
    };
  }

  static async detail(
    raw: InventoryDetailRow,
    storage: StorageService,
  ): Promise<Record<string, unknown>> {
    const images = await Promise.all(
      raw.images.map((url) => storage.getSignedUrl({ url })),
    );

    return {
      id: raw._id,
      sku: raw.sku,
      onHand: raw.onHand,
      reservedQty: raw.reservedQty,
      minStockThreshold: raw.minStockThreshold,
      status: raw.status,
      unitPrice: raw.unitPrice,
      currency: raw.currency,
      productName: raw.productName,
      images,
      categoryId: raw.categoryId,
      lastMovementAt: raw.lastMovementAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  static async list(
    raw: {
      data: InventoryListRow[];
      total: number;
      page: number;
      pageSize: number;
    },
    storage: StorageService,
  ): Promise<Record<string, unknown>> {
    return {
      data: await Promise.all(
        raw.data.map((r) => InventoryFormatter.item(r, storage)),
      ),
      total: raw.total,
      page: raw.page,
      pageSize: raw.pageSize,
    };
  }
}
