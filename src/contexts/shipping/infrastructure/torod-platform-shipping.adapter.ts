import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CreateWarehouseInput,
  IPlatformShippingPort,
  PlatformLabelResult,
  RateQuoteInput,
  RateQuoteOption,
  RequestPlatformLabelInput,
} from '../application/ports/platform-shipping.port';

interface TorodTokenResponse {
  data: { bearer_token: string };
}

interface TorodCourierPartner {
  id: number;
  name: string;
  rate?: number;
  approximate_delivery_time?: string;
  type?: string;
  is_own?: number;
}

interface TorodCreateOrderResponse {
  order_id: number | string;
}

@Injectable()
export class TorodPlatformShippingAdapter implements IPlatformShippingPort {
  private readonly logger = new Logger(TorodPlatformShippingAdapter.name);
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly warehouseCode: string;
  private readonly warehouseCityId: number;
  private readonly defaultWeightKg: number;

  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;
  private authInFlight: Promise<string> | null = null;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('TOROD_BASE_URL') ||
      'https://demo.stage.torod.co/en/api/';
    this.clientId = this.configService.get<string>('TOROD_CLIENT_ID') || '';
    this.clientSecret =
      this.configService.get<string>('TOROD_CLIENT_SECRET') || '';
    this.warehouseCode =
      this.configService.get<string>('TOROD_WAREHOUSE_CODE') || '';
    this.warehouseCityId = Number(
      this.configService.get<string>('TOROD_WAREHOUSE_CITY_ID') || '3',
    );
    this.defaultWeightKg = Number(
      this.configService.get<string>('TOROD_DEFAULT_WEIGHT_KG') || '1',
    );

    if (!this.clientId || !this.clientSecret || !this.warehouseCode) {
      this.logger.warn(
        'Torod credentials are not fully configured. Platform shipping will not work.',
      );
    }
  }

  async getRates(input: RateQuoteInput): Promise<RateQuoteOption[]> {
    const auth = await this.authHeader();
    const url = this.url('courier/partners/by/cityid');

    const form = new URLSearchParams({
      shipper_city_id: String(this.warehouseCityId),
      customer_city_id: String(input.destination.cityId),
      payment: 'Prepaid',
      weight: String(input.weightKg || this.defaultWeightKg),
      order_total: String(input.totals.amount || 1),
      no_of_box: String(input.boxCount || 1),
      type: 'normal',
      filter_by: 'cheapest',
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      try {
        const json = JSON.parse(text) as { message?: string };
        if (response.status === 406 && typeof json.message === 'string') {
          return [];
        }
      } catch {
        // not JSON — fall through to throw
      }
      throw new Error(`Torod getRates failed: ${response.status} ${text}`);
    }

    const data = (await response.json()) as {
      data?: TorodCourierPartner[];
    };
    const partners = data.data ?? [];

    return partners.map((p) => ({
      courierPartnerId: p.id,
      courierName: p.name,
      price: p.rate ?? 0,
      eta: p.approximate_delivery_time,
      type: p.type,
      isOwn: Boolean(p.is_own),
    }));
  }

  async requestLabel(
    input: RequestPlatformLabelInput,
  ): Promise<PlatformLabelResult> {
    const auth = await this.authHeader();

    const createResponse = await fetch(this.url('order/create'), {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input.recipient.name,
        email: input.recipient.email,
        phone: input.recipient.phone,
        item_description: input.items
          .map((i) => `${i.description} x${i.qty}`)
          .join(', '),
        order_total: input.totals.amount,
        payment: 'prepaid',
        weight: input.weightKg || this.defaultWeightKg,
        no_of_box: input.boxCount || 1,
        type: 'address',
        address: input.destination.line1,
        city_id: input.destination.cityId,
        warehouse: this.warehouseCode,
        reference_id: input.orderId,
      }),
    });

    if (!createResponse.ok) {
      const text = await createResponse.text();
      throw new Error(
        `Torod order/create failed: ${createResponse.status} ${text}`,
      );
    }

    const created =
      (await createResponse.json()) as TorodCreateOrderResponse & {
        order_id: number | string;
      };
    const torodOrderId = String(created.order_id);

    const shipResponse = await fetch(this.url('order/ship/process'), {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: torodOrderId,
        warehouse: this.warehouseCode,
        type: 'address',
        courier_partner_id: input.courierPartnerId,
      }),
    });

    if (!shipResponse.ok) {
      const text = await shipResponse.text();
      try {
        await this.cancelShipment(torodOrderId);
      } catch (cancelErr) {
        this.logger.warn(
          `Failed to cancel Torod order '${torodOrderId}' after ship/process failure: ${String(cancelErr)}`,
        );
      }
      throw new Error(
        `Torod order/ship/process failed: ${shipResponse.status} ${text}`,
      );
    }

    const shipped = (await shipResponse.json()) as {
      courier_name?: string;
      tracking_number?: string;
      tracking_url?: string;
      aws_label?: string;
    };

    return {
      carrier: shipped.courier_name ?? 'torod',
      trackingNumber: shipped.tracking_number ?? null,
      trackingUrl: shipped.tracking_url ?? shipped.aws_label ?? null,
      vendorOrderId: torodOrderId,
    };
  }

  async getGeo(
    resource: 'cities' | 'regions' | 'countries',
    filterId?: string,
  ): Promise<Record<string, unknown>> {
    const auth = await this.authHeader();
    const paramName =
      resource === 'regions'
        ? 'country_id'
        : resource === 'cities'
          ? 'region_id'
          : null;
    const query = filterId && paramName ? `?${paramName}=${filterId}` : '';
    const path = `get-all/${resource}${query}`;
    const response = await fetch(this.url(path), {
      headers: { ...auth },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Torod geo/${resource} failed: ${response.status} ${text}`,
      );
    }

    return (await response.json()) as Record<string, unknown>;
  }

  async createWarehouse(
    input: CreateWarehouseInput,
  ): Promise<Record<string, unknown>> {
    const auth = await this.authHeader();

    const form = new URLSearchParams({
      warehouse_name: input.warehouseName,
      warehouse: input.warehouseCode,
      contact_name: input.contactName,
      phone_number: input.phoneNumber,
      email: input.email,
      type: 'address_city',
      address: input.address,
      city_id: String(input.cityId),
    });

    if (input.zipCode) form.append('zip_code', input.zipCode);
    if (input.shortAddress) form.append('short_address', input.shortAddress);
    if (input.latitude != null) form.append('latitude', String(input.latitude));
    if (input.longitude != null)
      form.append('longitude', String(input.longitude));

    const response = await fetch(this.url('create/address'), {
      method: 'POST',
      headers: {
        ...auth,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: form.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      let message = `Torod create/address failed: ${response.status}`;
      try {
        const json = JSON.parse(text) as { message?: string; errors?: unknown };
        if (json.message) message = json.message;
      } catch {
        // not JSON — use raw text
        if (text) message = text;
      }
      throw new BadRequestException(message);
    }

    return (await response.json()) as Record<string, unknown>;
  }

  async listWarehouses(page?: number): Promise<Record<string, unknown>> {
    const auth = await this.authHeader();
    const query = page != null ? `?page=${page}` : '';
    const response = await fetch(this.url(`address/list${query}`), {
      headers: { ...auth, Accept: 'application/json' },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Torod address/list failed: ${response.status} ${text}`);
    }

    return (await response.json()) as Record<string, unknown>;
  }

  async getWarehouse(warehouseCode: string): Promise<Record<string, unknown>> {
    const auth = await this.authHeader();

    const form = new URLSearchParams({ warehouse: warehouseCode });

    const response = await fetch(this.url('address/details'), {
      method: 'POST',
      headers: {
        ...auth,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: form.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Torod address/details failed: ${response.status} ${text}`,
      );
    }

    return (await response.json()) as Record<string, unknown>;
  }

  async cancelShipment(vendorOrderId: string): Promise<void> {
    const auth = await this.authHeader();

    const response = await fetch(this.url('shipments/cancel'), {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracking_or_order_id: vendorOrderId }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Torod shipments/cancel failed: ${response.status} ${text}`,
      );
    }
  }

  private async authHeader(): Promise<Record<string, string>> {
    const token = await this.authenticate();
    return { Authorization: `Bearer ${token}` };
  }

  private async authenticate(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    if (this.authInFlight) {
      return this.authInFlight;
    }

    this.authInFlight = this.fetchToken().finally(() => {
      this.authInFlight = null;
    });

    return this.authInFlight;
  }

  private async fetchToken(): Promise<string> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch(this.url('token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Torod authentication failed: ${response.status} ${text}`,
      );
    }

    const data = (await response.json()) as TorodTokenResponse;
    this.cachedToken = data.data.bearer_token;
    this.tokenExpiresAt = Date.now() + 50 * 60 * 1000;

    return this.cachedToken;
  }

  private url(path: string): string {
    const base = this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`;
    return `${base}${path}`;
  }
}
