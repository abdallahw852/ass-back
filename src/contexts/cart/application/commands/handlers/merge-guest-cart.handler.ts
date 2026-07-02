import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { MergeGuestCartCommand } from '../merge-guest-cart.command';
import { CartRepository } from '../../../infrastructure/repositories/cart.repository';
import { ProductOrmEntity } from '../../../../../contexts/product/infrastructure/persistence/product.orm-entity';
import { ProductVariantOrmEntity } from '../../../../../contexts/product/infrastructure/persistence/product-variant.orm-entity';
import { ProductStatus } from '../../../../../contexts/product/domain/enums';

@CommandHandler(MergeGuestCartCommand)
export class MergeGuestCartHandler implements ICommandHandler<MergeGuestCartCommand> {
  constructor(
    private readonly cartRepo: CartRepository,
    @InjectRepository(ProductOrmEntity, 'write')
    private readonly productRepo: Repository<ProductOrmEntity>,
    @InjectRepository(ProductVariantOrmEntity, 'write')
    private readonly variantRepo: Repository<ProductVariantOrmEntity>,
  ) {}

  async execute(
    command: MergeGuestCartCommand,
  ): Promise<{ mergedCount: number }> {
    if (!command.items.length) return { mergedCount: 0 };

    const cart = await this.cartRepo.findOrCreateByBuyer(command.buyerId);
    let mergedCount = 0;

    for (const guestItem of command.items) {
      const product = await this.productRepo.findOne({
        where: { _id: guestItem.productId },
      });
      if (!product || product.status !== ProductStatus.ACTIVE) continue;

      let variantInternalId: number | null = null;
      let variantPublicId: string | null = null;
      if (guestItem.variantId) {
        const variant = await this.variantRepo.findOne({
          where: { _id: guestItem.variantId, productId: product.id },
        });
        if (!variant) continue;
        variantInternalId = variant.id;
        variantPublicId = variant._id;
      }

      const existing = await this.cartRepo.findItemByProductAndCart(
        cart.id,
        product.id,
        variantInternalId,
      );

      const productImage =
        Array.isArray(product.images) && product.images.length > 0
          ? product.images[0]
          : null;

      if (existing) {
        const mergedQty = Math.max(existing.quantity, guestItem.quantity);
        const targetPrice =
          existing.targetPrice !== null
            ? existing.targetPrice
            : (guestItem.targetPrice ?? null);
        await this.cartRepo.updateItem(existing.id, {
          quantity: mergedQty,
          targetPrice,
          notes: existing.notes ?? guestItem.notes ?? null,
        });
      } else {
        await this.cartRepo.addItem(cart.id, {
          productId: product.id,
          productPublicId: product._id,
          variantId: variantInternalId,
          variantPublicId,
          quantity: guestItem.quantity,
          unitPrice:
            product.discountedPrice !== null
              ? Number(product.discountedPrice)
              : Number(product.costPrice),
          targetPrice: guestItem.targetPrice ?? null,
          notes: guestItem.notes ?? null,
          supplierId: product.supplierId,
          productName: product.name,
          productImage,
        });
      }
      mergedCount++;
    }

    return { mergedCount };
  }
}
