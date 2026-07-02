export const PLATFORM_SHIPPING_PORT = Symbol('PLATFORM_SHIPPING_PORT');

export interface CreateWarehouseInput {
  warehouseName: string;
  warehouseCode: string;
  contactName: string;
  phoneNumber: string;
  email: string;
  cityId: number;
  address: string;
  zipCode?: string;
  shortAddress?: string;
  latitude?: number;
  longitude?: number;
}

export interface RequestPlatformLabelInput {
  orderId: string;
  courierPartnerId: number;
  recipient: { name: string; email: string; phone: string };
  destination: {
    line1: string;
    cityId: number;
    postalCode?: string;
    country: string;
  };
  items: { description: string; qty: number; price: number }[];
  totals: { amount: number; currency: string };
  weightKg: number;
  boxCount: number;
}

export interface PlatformLabelResult {
  carrier: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  vendorOrderId: string;
}

export interface RateQuoteInput {
  destination: { cityId: number; country: string };
  weightKg: number;
  boxCount: number;
  totals: { amount: number; currency: string };
}

export interface RateQuoteOption {
  courierPartnerId: number;
  courierName: string;
  price: number;
  eta?: string;
  type?: string;
  isOwn?: boolean;
}

export interface IPlatformShippingPort {
  getRates(input: RateQuoteInput): Promise<RateQuoteOption[]>;
  requestLabel(input: RequestPlatformLabelInput): Promise<PlatformLabelResult>;
  cancelShipment(vendorOrderId: string): Promise<void>;
  getGeo(
    resource: 'cities' | 'regions' | 'countries',
    filterId?: string,
  ): Promise<Record<string, unknown>>;
  createWarehouse(
    input: CreateWarehouseInput,
  ): Promise<Record<string, unknown>>;
  listWarehouses(page?: number): Promise<Record<string, unknown>>;
  getWarehouse(warehouseCode: string): Promise<Record<string, unknown>>;
}
