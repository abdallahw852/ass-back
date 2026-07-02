import { StorageService } from '../../../shared/infrastructure/services/storage.service';

export class CartFormatter {
  static async item(
    raw: Record<string, unknown>,
    storage: StorageService,
  ): Promise<Record<string, unknown>> {
    const productImage = (raw.productImage ?? null) as string | null;
    return {
      id: raw.id as string,
      productId: raw.productId as string,
      productName: raw.productName as string,
      productImage: productImage
        ? await storage.getSignedUrl({ url: productImage })
        : null,
      variantId: (raw.variantId ?? null) as string | null,
      quantity: raw.quantity as number,
      unitPrice: (raw.unitPrice ?? null) as number | null,
      targetPrice: (raw.targetPrice ?? null) as number | null,
      notes: (raw.notes ?? null) as string | null,
      supplierId: raw.supplierId as number,
    };
  }

  static attachment(raw: Record<string, unknown>): Record<string, unknown> {
    return {
      id: raw.id as string,
      url: raw.url as string,
      originalName: raw.originalName as string,
      mimeType: raw.mimeType as string,
      size: raw.size as number,
    };
  }

  static async supplierGroup(
    raw: Record<string, unknown>,
    storage: StorageService,
  ): Promise<Record<string, unknown>> {
    return {
      id: (raw.id ?? null) as string | null,
      supplierId: raw.supplierId as number,
      message: (raw.message ?? null) as string | null,
      shippingDestination: (raw.shippingDestination ?? null) as unknown,
      shippingMethod: (raw.shippingMethod ?? 'supplier') as string,
      selectedShippingOption: (raw.selectedShippingOption ?? null) as unknown,
      attachments: ((raw.attachments ?? []) as Record<string, unknown>[]).map(
        (a) => CartFormatter.attachment(a),
      ),
      items: await Promise.all(
        ((raw.items ?? []) as Record<string, unknown>[]).map((i) =>
          CartFormatter.item(i, storage),
        ),
      ),
    };
  }

  static async cart(
    raw: Record<string, unknown>,
    storage: StorageService,
  ): Promise<Record<string, unknown>> {
    return {
      id: raw.id as string,
      itemCount: raw.itemCount as number,
      supplierGroups: await Promise.all(
        ((raw.supplierGroups ?? []) as Record<string, unknown>[]).map((g) =>
          CartFormatter.supplierGroup(g, storage),
        ),
      ),
    };
  }
}
