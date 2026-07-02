import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { CheckoutCartCommand } from './checkout-cart.command';
import type { ITradeOrderRepository } from '../../domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../../domain/order.repository.interface';
import { TradeOrder } from '../../domain/trade-order.entity';
import {
  EmptyCartException,
  ProductUnavailableException,
} from '../../domain/order.exceptions';
import { InsufficientStockException } from '../../../inventory/domain/inventory.exceptions';
import { CartRepository } from '../../../cart/infrastructure/repositories/cart.repository';
import { PricingTierOrmEntity } from '../../../product/infrastructure/persistence/pricing-tier.orm-entity';
import { BelowMinimumOrderQuantityException } from '../../../cart/domain/cart.exceptions';
import { ProductOrmEntity } from '../../../product/infrastructure/persistence/product.orm-entity';
import { ProductStatus } from '../../../product/domain/enums';
import type { PaymentGatewayPort } from '../../../payment/application/ports/payment-gateway.port';
import { PAYMENT_GATEWAY_PORT } from '../../../payment/application/ports/payment-gateway.port';

@CommandHandler(CheckoutCartCommand)
export class CheckoutCartHandler implements ICommandHandler<CheckoutCartCommand> {
  constructor(
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
    private readonly cartRepo: CartRepository,
    @InjectRepository(PricingTierOrmEntity, 'write')
    private readonly tierRepo: Repository<PricingTierOrmEntity>,
    @InjectRepository(ProductOrmEntity, 'write')
    private readonly productRepo: Repository<ProductOrmEntity>,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly paymentGateway: PaymentGatewayPort,
  ) {}

  async execute(
    command: CheckoutCartCommand,
  ): Promise<Record<string, unknown>> {
    const cart = await this.cartRepo.findOrCreateByBuyer(command.buyerId);
    if (!cart.items.length) throw new EmptyCartException();

    const selectedItems =
      command.itemIds.length > 0
        ? cart.items.filter((item) => command.itemIds.includes(item._id))
        : cart.items;

    if (!selectedItems.length) throw new EmptyCartException();

    const productIds = selectedItems.map((item) => item.productId);

    const products = await this.productRepo.find({
      where: { id: In(productIds) },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const allTiers = await this.tierRepo.find({
      where: { productId: In(productIds) },
      order: { minQuantity: 'DESC' },
    });

    const tiersByProductId = new Map<number, PricingTierOrmEntity[]>();
    for (const tier of allTiers) {
      if (!tiersByProductId.has(tier.productId)) {
        tiersByProductId.set(tier.productId, []);
      }
      tiersByProductId.get(tier.productId)!.push(tier);
    }

    const checkoutItems = selectedItems.map((item) => {
      const product = productMap.get(item.productId);

      if (!product || product.status !== ProductStatus.ACTIVE) {
        throw new ProductUnavailableException(item.productPublicId);
      }

      if (item.quantity < product.moq) {
        throw new BelowMinimumOrderQuantityException(product.moq);
      }

      if (item.quantity > (product.stockQuantity ?? 0)) {
        throw new InsufficientStockException(
          product.stockQuantity ?? 0,
          item.quantity,
        );
      }

      const tiers = tiersByProductId.get(item.productId) || [];

      let unitPrice = Number(product.discountedPrice ?? product.costPrice);
      for (const tier of tiers) {
        if (
          item.quantity >= tier.minQuantity &&
          (tier.maxQuantity === null || item.quantity <= tier.maxQuantity)
        ) {
          unitPrice = Number(tier.unitPrice);
          break;
        }
      }

      return {
        productId: item.productPublicId,
        productName: item.productName,
        variantId: item.variantPublicId ?? null,
        quantity: item.quantity,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
        supplierId: item.supplierId,
        cartItemId: item._id,
      };
    });

    const groupedItems = new Map<number, typeof checkoutItems>();
    let totalAmount = 0;

    for (const item of checkoutItems) {
      if (!groupedItems.has(item.supplierId)) {
        groupedItems.set(item.supplierId, []);
      }
      groupedItems.get(item.supplierId)!.push(item);
      totalAmount += item.lineTotal;
    }

    const shippingMethodBySupplierId = new Map(
      (cart.supplierGroups ?? []).map((group) => [
        group.supplierId,
        group.shippingMethod ?? 'supplier',
      ]),
    );

    const shippingCostBySupplierId = new Map(
      (cart.supplierGroups ?? []).map((group) => [
        group.supplierId,
        group.shippingMethod === 'platform' && group.selectedShippingOption
          ? Number(group.selectedShippingOption.price ?? 0)
          : 0,
      ]),
    );

    const shippingSnapshotBySupplierId = new Map(
      (cart.supplierGroups ?? []).map((group) => {
        const dest = group.shippingDestination;
        const opt = group.selectedShippingOption;
        if (
          group.shippingMethod === 'platform' &&
          opt &&
          dest &&
          dest.torodCityId
        ) {
          return [
            group.supplierId,
            {
              courierPartnerId: opt.courierPartnerId,
              destination: {
                line1: dest.line1 ?? '',
                cityId: dest.torodCityId,
                country: dest.country,
                postalCode: dest.postalCode,
              },
            },
          ] as const;
        }
        return [group.supplierId, null] as const;
      }),
    );

    for (const shippingCost of shippingCostBySupplierId.values()) {
      totalAmount += shippingCost;
    }

    const merchantOrderId = randomUUID();
    const currency = 'SAR'; // Assuming SAR as default currency for now

    const paymentResult = await this.paymentGateway.createPaymentIntention({
      amountCents: Math.round(totalAmount * 100),
      currency,
      merchantOrderId,
    });

    const ordersToSave: TradeOrder[] = [];

    for (const [supplierId, items] of groupedItems) {
      const order = TradeOrder.create({
        buyerId: command.buyerId,
        supplierId,
        lines: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          variantId: i.variantId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
        })),
        currency,
        paymentIntentId: paymentResult.paymentIntentId,
        paymobOrderId: paymentResult.paymentIntentId,
        cartItemIds: items.map((i) => i.cartItemId),
        shippingMethod:
          shippingMethodBySupplierId.get(supplierId) ?? 'supplier',
        platformShippingSnapshot:
          shippingSnapshotBySupplierId.get(supplierId) ?? null,
        shippingCost: shippingCostBySupplierId.get(supplierId) ?? 0,
      });
      ordersToSave.push(order);
    }

    const savedOrders = await this.tradeOrderRepo.saveMany(ordersToSave);

    return {
      orders: savedOrders.map((o) => ({
        id: o.id,
        referenceNumber: o.referenceNumber,
        buyerId: o.buyerId,
        supplierId: o.supplierId,
        subtotal: o.subtotal,
        status: o.status,
        createdAt: o.createdAt,
      })),
      clientSecret: paymentResult.clientSecret,
    };
  }
}
