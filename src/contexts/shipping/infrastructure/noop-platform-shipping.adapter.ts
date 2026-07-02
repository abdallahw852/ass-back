import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
  CreateWarehouseInput,
  IPlatformShippingPort,
  PlatformLabelResult,
  RateQuoteInput,
  RateQuoteOption,
  RequestPlatformLabelInput,
} from '../application/ports/platform-shipping.port';

@Injectable()
export class NoopPlatformShippingAdapter implements IPlatformShippingPort {
  getRates(_input: RateQuoteInput): Promise<RateQuoteOption[]> {
    return Promise.resolve([
      {
        courierPartnerId: 1,
        courierName: 'noop-carrier',
        price: 0,
        eta: '3-5 days',
        type: 'standard',
      },
    ]);
  }

  requestLabel(
    _input: RequestPlatformLabelInput,
  ): Promise<PlatformLabelResult> {
    const vendorOrderId = `NOOP-${randomUUID().slice(0, 8).toUpperCase()}`;
    return Promise.resolve({
      carrier: 'noop-carrier',
      trackingNumber: null,
      trackingUrl: null,
      vendorOrderId,
    });
  }

  cancelShipment(_vendorOrderId: string): Promise<void> {
    return Promise.resolve();
  }

  getGeo(
    _resource: 'cities' | 'regions' | 'countries',
    _filterId?: string,
  ): Promise<Record<string, unknown>> {
    return Promise.resolve({});
  }

  createWarehouse(
    _input: CreateWarehouseInput,
  ): Promise<Record<string, unknown>> {
    return Promise.resolve({});
  }

  listWarehouses(_page?: number): Promise<Record<string, unknown>> {
    return Promise.resolve({ data: [] });
  }

  getWarehouse(_warehouseCode: string): Promise<Record<string, unknown>> {
    return Promise.resolve({});
  }
}
