import { Shipment } from './shipment.entity';

export const SHIPMENT_REPOSITORY = Symbol('SHIPMENT_REPOSITORY');

export interface IShipmentRepository {
  save(shipment: Shipment): Promise<Shipment>;
  findByPublicId(id: string): Promise<Shipment | null>;
  findByOrderId(orderId: number): Promise<Shipment | null>;
  findByVendorOrderId(vendorOrderId: string): Promise<Shipment | null>;
  update(shipment: Shipment): Promise<void>;
}
