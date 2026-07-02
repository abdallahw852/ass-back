import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AddToCartCommand } from '../add-to-cart.command';
import { CartRepository } from '../../../infrastructure/repositories/cart.repository';
import { ProductOrmEntity } from '../../../../../contexts/product/infrastructure/persistence/product.orm-entity';
import { ProductVariantOrmEntity } from '../../../../../contexts/product/infrastructure/persistence/product-variant.orm-entity';
import { SupplierOrmEntity } from '../../../../../contexts/supplier/identity/infrastructure/persistence/supplier.orm-entity';
import {
  BelowMinimumOrderQuantityException,
  InactiveProductCannotBeAddedException,
  InactiveSupplierCannotBeAddedException,
  ProductVariantNotFoundException,
} from '../../../domain/cart.exceptions';
import { ProductStatus } from '../../../../../contexts/product/domain/enums';

@CommandHandler(AddToCartCommand)
export class AddToCartHandler implements ICommandHandler<AddToCartCommand> {
  constructor(
    private readonly cartRepo: CartRepository,
    @InjectRepository(ProductOrmEntity, 'write')
    private readonly productRepo: Repository<ProductOrmEntity>,
    @InjectRepository(ProductVariantOrmEntity, 'write')
    private readonly variantRepo: Repository<ProductVariantOrmEntity>,
    @InjectRepository(SupplierOrmEntity, 'write')
    private readonly supplierRepo: Repository<SupplierOrmEntity>,
  ) {}

  async execute(command: AddToCartCommand): Promise<Record<string, unknown>> {
    const product = await this.productRepo.findOne({
      where: { _id: command.productId },
    });

    if (!product)
      throw new InactiveProductCannotBeAddedException(command.productId);
    if (product.status !== ProductStatus.ACTIVE) {
      throw new InactiveProductCannotBeAddedException(command.productId);
    }

    const supplier = await this.supplierRepo.findOne({
      where: { id: product.supplierId },
    });
    if (!supplier || !supplier.isVerified) {
      throw new InactiveSupplierCannotBeAddedException();
    }

    if (command.quantity < product.moq) {
      throw new BelowMinimumOrderQuantityException(product.moq);
    }

    let variantInternalId: number | null = null;
    let variantPublicId: string | null = null;

    if (command.variantId) {
      const variant = await this.variantRepo.findOne({
        where: { _id: command.variantId, productId: product.id },
      });
      if (!variant)
        throw new ProductVariantNotFoundException(command.variantId);
      variantInternalId = variant.id;
      variantPublicId = variant._id;
    }

    const cart = await this.cartRepo.findOrCreateByBuyer(command.buyerId);

    const existing = await this.cartRepo.findItemByProductAndCart(
      cart.id,
      product.id,
      variantInternalId,
    );

    const productImage =
      Array.isArray(product.images) && product.images.length > 0
        ? product.images[0]
        : null;

    const unitPrice =
      product.discountedPrice !== null
        ? Number(product.discountedPrice)
        : Number(product.costPrice);

    if (existing) {
      const newQty = existing.quantity + command.quantity;
      await this.cartRepo.updateItem(existing.id, {
        quantity: newQty,
        targetPrice:
          command.targetPrice !== undefined
            ? (command.targetPrice ?? null)
            : undefined,
        notes:
          command.notes !== undefined ? (command.notes ?? null) : undefined,
      });
      return {
        id: existing._id,
        productId: product._id,
        productName: existing.productName,
        variantId: existing.variantPublicId,
        quantity: newQty,
        unitPrice:
          existing.unitPrice !== null ? Number(existing.unitPrice) : unitPrice,
        targetPrice: existing.targetPrice,
        notes: existing.notes,
        supplierId: existing.supplierId,
      };
    }

    const item = await this.cartRepo.addItem(cart.id, {
      productId: product.id,
      productPublicId: product._id,
      variantId: variantInternalId,
      variantPublicId,
      quantity: command.quantity,
      unitPrice,
      targetPrice: command.targetPrice ?? null,
      notes: command.notes ?? null,
      supplierId: product.supplierId,
      productName: product.name,
      productImage,
    });

    return {
      id: item._id,
      productId: product._id,
      productName: item.productName,
      productImage: item.productImage,
      variantId: item.variantPublicId,
      quantity: item.quantity,
      unitPrice: item.unitPrice !== null ? Number(item.unitPrice) : null,
      targetPrice: item.targetPrice,
      notes: item.notes,
      supplierId: item.supplierId,
    };
  }
}
