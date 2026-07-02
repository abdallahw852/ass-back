import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { ITradeOrderRepository } from '../domain/order.repository.interface';
import {
  TradeOrder,
  OrderLine,
  TradeOrderStatus,
  ShippingMethod,
  PlatformShippingSnapshot,
} from '../domain/trade-order.entity';
import { TradeOrderOrmEntity } from './persistence/trade-order.orm-entity';

@Injectable()
export class TradeOrderRepository implements ITradeOrderRepository {
  constructor(
    @InjectRepository(TradeOrderOrmEntity, 'write')
    private readonly repository: Repository<TradeOrderOrmEntity>,
  ) {}

  private toDomain(entity: TradeOrderOrmEntity): TradeOrder {
    return TradeOrder.reconstitute({
      _id: entity._id,
      internalId: entity.id,
      referenceNumber: entity.reference_number,
      buyerId: entity.buyer_id,
      supplierId: entity.supplier_id,
      lines: entity.lines as unknown as OrderLine[],
      subtotal: Number(entity.subtotal),
      shippingCost: Number(entity.shipping_cost ?? 0),
      currency: entity.currency,
      status: entity.status as TradeOrderStatus,
      paymentIntentId: entity.payment_intent_id,
      paymobOrderId: entity.paymob_order_id,
      cartItemIds: entity.cart_item_ids,
      shippingMethod: (entity.shipping_method ?? 'supplier') as ShippingMethod,
      platformShippingSnapshot:
        (entity.platform_shipping_snapshot as PlatformShippingSnapshot | null) ??
        null,
      carrier: entity.carrier,
      trackingNumber: entity.tracking_number,
      trackingUrl: entity.tracking_url,
      shippedAt: entity.shipped_at,
      deliveredAt: entity.delivered_at,
      releasedAt: entity.released_at,
      autoReleaseAt: entity.auto_release_at,
      protectionWindowDays: entity.protection_window_days ?? 14,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    });
  }

  private toOrmEntity(domain: TradeOrder): TradeOrderOrmEntity {
    const entity = new TradeOrderOrmEntity();
    if (domain.internalId) {
      entity.id = domain.internalId;
    }
    entity._id = domain.id;
    entity.reference_number = domain.referenceNumber;
    entity.buyer_id = domain.buyerId;
    entity.supplier_id = domain.supplierId;
    entity.lines = domain.lines as unknown as Record<string, unknown>[];
    entity.subtotal = domain.subtotal;
    entity.shipping_cost = domain.shippingCost;
    entity.currency = domain.currency;
    entity.status = domain.status;
    entity.payment_intent_id = domain.paymentIntentId;
    entity.paymob_order_id = domain.paymobOrderId;
    entity.cart_item_ids = domain.cartItemIds;
    entity.shipping_method = domain.shippingMethod;
    entity.platform_shipping_snapshot =
      domain.platformShippingSnapshot as Record<string, unknown> | null;
    entity.carrier = domain.carrier;
    entity.tracking_number = domain.trackingNumber;
    entity.tracking_url = domain.trackingUrl;
    entity.shipped_at = domain.shippedAt;
    entity.delivered_at = domain.deliveredAt;
    entity.released_at = domain.releasedAt;
    entity.auto_release_at = domain.autoReleaseAt;
    entity.protection_window_days = domain.protectionWindowDays;
    entity.created_at = domain.createdAt;
    entity.updated_at = domain.updatedAt;
    return entity;
  }

  async save(order: TradeOrder): Promise<TradeOrder> {
    const ormEntity = this.toOrmEntity(order);
    const saved = await this.repository.save(ormEntity);

    if (!saved.reference_number) {
      const referenceNumber = `ORD-${new Date().getUTCFullYear()}-${String(
        saved.id,
      ).padStart(5, '0')}`;
      await this.repository.update(saved.id, {
        reference_number: referenceNumber,
      });
      saved.reference_number = referenceNumber;
    }

    return this.toDomain(saved);
  }

  async saveMany(orders: TradeOrder[]): Promise<TradeOrder[]> {
    const ormEntities = orders.map((o) => this.toOrmEntity(o));
    const saved = await this.repository.save(ormEntities);

    const updated = [];
    for (const entity of saved) {
      if (!entity.reference_number) {
        const referenceNumber = `ORD-${new Date().getUTCFullYear()}-${String(
          entity.id,
        ).padStart(5, '0')}`;
        await this.repository.update(entity.id, {
          reference_number: referenceNumber,
        });
        entity.reference_number = referenceNumber;
      }
      updated.push(this.toDomain(entity));
    }
    return updated;
  }

  async findByPublicId(id: string): Promise<TradeOrder | null> {
    const entity = await this.repository.findOne({ where: { _id: id } });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async findByInternalId(id: number): Promise<TradeOrder | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async findByPaymobOrderId(paymobOrderId: string): Promise<TradeOrder[]> {
    const entities = await this.repository.find({
      where: { paymob_order_id: paymobOrderId },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByBuyerId(buyerId: number): Promise<TradeOrder[]> {
    const entities = await this.repository.find({
      where: { buyer_id: buyerId },
      order: { created_at: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findBySupplierId(supplierId: number): Promise<TradeOrder[]> {
    const entities = await this.repository.find({
      where: { supplier_id: supplierId },
      order: { created_at: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findDeliveredForAutoRelease(now: Date): Promise<TradeOrder[]> {
    const entities = await this.repository.find({
      where: {
        status: 'delivered',
        auto_release_at: LessThanOrEqual(now),
      },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findPendingPaymentByRfqAndBuyer(
    rfqId: string,
    buyerId: number,
  ): Promise<{
    id: string;
    clientSecret: string | null;
    subtotal: number;
    currency: string;
  } | null> {
    const entity = await this.repository.findOne({
      where: { rfq_id: rfqId, buyer_id: buyerId, status: 'pending_payment' },
      order: { created_at: 'DESC' },
    });
    if (!entity) return null;
    return {
      id: entity._id,
      clientSecret: entity.client_secret,
      subtotal: Number(entity.subtotal),
      currency: entity.currency,
    };
  }

  async findStatusByRfqId(rfqId: string): Promise<string | null> {
    const entity = await this.repository.findOne({
      where: { rfq_id: rfqId },
      order: { created_at: 'DESC' },
      select: ['status'],
    });
    return entity?.status ?? null;
  }

  async setRfqLink(
    orderId: string,
    rfqId: string,
    clientSecret: string,
  ): Promise<void> {
    await this.repository.update(
      { _id: orderId },
      { rfq_id: rfqId, client_secret: clientSecret },
    );
  }

  async update(order: TradeOrder): Promise<void> {
    const ormEntity = this.toOrmEntity(order);
    await this.repository.save(ormEntity);
  }
}
