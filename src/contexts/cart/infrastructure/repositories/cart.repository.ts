import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CartOrmEntity } from '../persistence/cart.orm-entity';
import { CartItemOrmEntity } from '../persistence/cart-item.orm-entity';
import { CartSupplierGroupOrmEntity } from '../persistence/cart-supplier-group.orm-entity';
import { CartAttachmentOrmEntity } from '../persistence/cart-attachment.orm-entity';
import type {
  CartShippingMethod,
  SelectedShippingOption,
  ShippingDestination,
} from '../persistence/cart-supplier-group.orm-entity';

@Injectable()
export class CartRepository {
  constructor(
    @InjectRepository(CartOrmEntity, 'write')
    private readonly cartRepo: Repository<CartOrmEntity>,
    @InjectRepository(CartItemOrmEntity, 'write')
    private readonly itemRepo: Repository<CartItemOrmEntity>,
    @InjectRepository(CartSupplierGroupOrmEntity, 'write')
    private readonly groupRepo: Repository<CartSupplierGroupOrmEntity>,
    @InjectRepository(CartAttachmentOrmEntity, 'write')
    private readonly attachmentRepo: Repository<CartAttachmentOrmEntity>,
  ) {}

  async findOrCreateByBuyer(buyerId: number): Promise<CartOrmEntity> {
    let cart = await this.cartRepo.findOne({
      where: { buyerId },
      relations: ['items', 'supplierGroups', 'supplierGroups.attachments'],
    });
    if (!cart) {
      cart = this.cartRepo.create({ buyerId, items: [], supplierGroups: [] });
      cart = await this.cartRepo.save(cart);
    }
    return cart;
  }

  async findByBuyerId(buyerId: number): Promise<CartOrmEntity | null> {
    return this.cartRepo.findOne({
      where: { buyerId },
      relations: ['items', 'supplierGroups', 'supplierGroups.attachments'],
    });
  }

  async findItemByPublicId(
    publicId: string,
  ): Promise<CartItemOrmEntity | null> {
    return this.itemRepo.findOne({ where: { _id: publicId } });
  }

  async findItemByProductAndCart(
    cartId: number,
    productId: number,
    variantId: number | null,
  ): Promise<CartItemOrmEntity | null> {
    return this.itemRepo.findOne({
      where: { cartId, productId, variantId: variantId ?? undefined },
    });
  }

  async addItem(
    cartId: number,
    data: {
      productId: number;
      productPublicId: string;
      variantId: number | null;
      variantPublicId: string | null;
      quantity: number;
      unitPrice: number | null;
      targetPrice: number | null;
      notes: string | null;
      supplierId: number;
      productName: string;
      productImage: string | null;
    },
  ): Promise<CartItemOrmEntity> {
    const item = this.itemRepo.create({ cartId, ...data });
    return this.itemRepo.save(item);
  }

  async updateItem(
    itemId: number,
    data: {
      quantity?: number;
      targetPrice?: number | null;
      notes?: string | null;
    },
  ): Promise<void> {
    await this.itemRepo.update(itemId, data);
  }

  async removeItem(itemId: number): Promise<void> {
    await this.itemRepo.delete(itemId);
  }

  async clearCart(cartId: number): Promise<void> {
    await this.itemRepo.delete({ cartId });
    await this.groupRepo.delete({ cartId });
  }

  async findGroupBySupplier(
    cartId: number,
    supplierId: number,
  ): Promise<CartSupplierGroupOrmEntity | null> {
    return this.groupRepo.findOne({
      where: { cartId, supplierId },
      relations: ['attachments'],
    });
  }

  async findGroupByPublicSupplierId(
    cartId: number,
    supplierPublicId: string,
  ): Promise<CartSupplierGroupOrmEntity | null> {
    const groups = await this.groupRepo.find({
      where: { cartId },
      relations: ['attachments'],
    });
    return (
      groups.find((g) => String(g.supplierId) === supplierPublicId) ?? null
    );
  }

  async upsertSupplierGroup(
    cartId: number,
    supplierId: number,
    data: {
      message?: string | null;
      shippingDestination?: ShippingDestination | null;
      shippingMethod?: CartShippingMethod;
      selectedShippingOption?: SelectedShippingOption | null;
    },
  ): Promise<CartSupplierGroupOrmEntity> {
    let group = await this.groupRepo.findOne({
      where: { cartId, supplierId },
      relations: ['attachments'],
    });
    if (!group) {
      group = this.groupRepo.create({
        cartId,
        supplierId,
        attachments: [],
        ...data,
        shippingMethod: data.shippingMethod ?? 'supplier',
      });
    } else {
      if (data.message !== undefined) group.message = data.message ?? null;
      if (data.shippingDestination !== undefined)
        group.shippingDestination = data.shippingDestination ?? null;
      if (data.shippingMethod !== undefined)
        group.shippingMethod = data.shippingMethod;
      if (data.selectedShippingOption !== undefined)
        group.selectedShippingOption = data.selectedShippingOption ?? null;
    }
    return this.groupRepo.save(group);
  }

  async addAttachmentToGroup(
    supplierGroupId: number,
    data: { url: string; originalName: string; mimeType: string; size: number },
  ): Promise<CartAttachmentOrmEntity> {
    const attachment = this.attachmentRepo.create({ supplierGroupId, ...data });
    return this.attachmentRepo.save(attachment);
  }

  async findAttachmentByPublicId(
    publicId: string,
  ): Promise<CartAttachmentOrmEntity | null> {
    return this.attachmentRepo.findOne({ where: { _id: publicId } });
  }

  async removeAttachment(attachmentId: number): Promise<void> {
    await this.attachmentRepo.delete(attachmentId);
  }

  async removeItemsBySupplier(
    cartId: number,
    supplierId: number,
  ): Promise<void> {
    await this.itemRepo.delete({ cartId, supplierId });
  }

  async removeGroupBySupplier(
    cartId: number,
    supplierId: number,
  ): Promise<void> {
    await this.groupRepo.delete({ cartId, supplierId });
  }

  async removeItemsByPublicIds(publicIds: string[]): Promise<void> {
    if (!publicIds.length) return;
    await this.itemRepo
      .createQueryBuilder()
      .delete()
      .where('_id IN (:...publicIds)', { publicIds })
      .execute();
  }

  async findItemsBySupplier(
    cartId: number,
    supplierId: number,
  ): Promise<CartItemOrmEntity[]> {
    return this.itemRepo.find({ where: { cartId, supplierId } });
  }
}
