import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Shipment, type ShipmentStatus } from '../domain/shipment.entity';
import type { TrackingEvent } from '../domain/tracking-event.value-object';
import type { IShipmentRepository } from '../domain/shipment.repository.interface';
import { ShipmentOrmEntity } from './persistence/shipment.orm-entity';

@Injectable()
export class ShipmentRepository implements IShipmentRepository {
  constructor(
    @InjectRepository(ShipmentOrmEntity, 'write')
    private readonly repository: Repository<ShipmentOrmEntity>,
  ) {}

  private toDomain(entity: ShipmentOrmEntity): Shipment {
    return Shipment.reconstitute({
      _id: entity._id,
      internalId: entity.id,
      orderId: entity.order_id,
      carrier: entity.carrier,
      trackingNumber: entity.tracking_number,
      trackingUrl: entity.tracking_url,
      vendorOrderId: entity.vendor_order_id,
      status: entity.status as ShipmentStatus,
      events: (entity.events ?? []).map((event) => ({
        ...event,
        timestamp: new Date(event.timestamp as string),
      })) as TrackingEvent[],
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    });
  }

  private toOrmEntity(domain: Shipment): ShipmentOrmEntity {
    const entity = new ShipmentOrmEntity();
    if (domain.internalId) {
      entity.id = domain.internalId;
    }
    entity._id = domain.id;
    entity.order_id = domain.orderId;
    entity.carrier = domain.carrier;
    entity.tracking_number = domain.trackingNumber;
    entity.tracking_url = domain.trackingUrl;
    entity.vendor_order_id = domain.vendorOrderId;
    entity.status = domain.status;
    entity.events = domain.events as unknown as Record<string, unknown>[];
    entity.created_at = domain.createdAt;
    entity.updated_at = domain.updatedAt;
    return entity;
  }

  async save(shipment: Shipment): Promise<Shipment> {
    const saved = await this.repository.save(this.toOrmEntity(shipment));
    return this.toDomain(saved);
  }

  async findByPublicId(id: string): Promise<Shipment | null> {
    const entity = await this.repository.findOne({ where: { _id: id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByOrderId(orderId: number): Promise<Shipment | null> {
    const entity = await this.repository.findOne({
      where: { order_id: orderId },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByVendorOrderId(vendorOrderId: string): Promise<Shipment | null> {
    const entity = await this.repository.findOne({
      where: { vendor_order_id: vendorOrderId },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async update(shipment: Shipment): Promise<void> {
    await this.repository.save(this.toOrmEntity(shipment));
  }
}
