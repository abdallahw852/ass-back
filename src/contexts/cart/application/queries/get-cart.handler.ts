import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { GetCartQuery } from './get-cart.query';
import { CartRepository } from '../../infrastructure/repositories/cart.repository';

@QueryHandler(GetCartQuery)
export class GetCartHandler implements IQueryHandler<GetCartQuery> {
  constructor(private readonly cartRepo: CartRepository) {}

  async execute(query: GetCartQuery): Promise<Record<string, unknown>> {
    const cart = await this.cartRepo.findOrCreateByBuyer(query.buyerId);

    const groupMap = new Map<
      number,
      {
        id: string | null;
        supplierId: number;
        message: string | null;
        shippingDestination: unknown;
        shippingMethod: 'platform' | 'supplier';
        selectedShippingOption: unknown;
        attachments: Record<string, unknown>[];
        items: Record<string, unknown>[];
      }
    >();

    for (const item of cart.items) {
      if (!groupMap.has(item.supplierId)) {
        groupMap.set(item.supplierId, {
          id: null,
          supplierId: item.supplierId,
          message: null,
          shippingDestination: null,
          shippingMethod: 'supplier',
          selectedShippingOption: null,
          attachments: [],
          items: [],
        });
      }
      groupMap.get(item.supplierId)!.items.push({
        id: item._id,
        productId: item.productPublicId,
        productName: item.productName,
        productImage: item.productImage,
        variantId: item.variantPublicId ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice !== null ? Number(item.unitPrice) : null,
        targetPrice:
          item.targetPrice !== null ? Number(item.targetPrice) : null,
        notes: item.notes,
        supplierId: item.supplierId,
      });
    }

    for (const group of cart.supplierGroups ?? []) {
      const existing = groupMap.get(group.supplierId);
      if (existing) {
        existing.id = group._id;
        existing.message = group.message;
        existing.shippingDestination = group.shippingDestination;
        existing.shippingMethod = group.shippingMethod ?? 'supplier';
        existing.selectedShippingOption = group.selectedShippingOption ?? null;
        existing.attachments = (group.attachments ?? []).map((a) => ({
          id: a._id,
          url: a.url,
          originalName: a.originalName,
          mimeType: a.mimeType,
          size: a.size,
        }));
      }
    }

    const supplierGroups = Array.from(groupMap.values());

    return {
      id: cart._id,
      itemCount: cart.items.length,
      supplierGroups,
    };
  }
}
