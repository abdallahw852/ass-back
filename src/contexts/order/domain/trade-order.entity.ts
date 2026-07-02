import { randomUUID } from 'node:crypto';
import {
  OrderTransitionException,
  PlatformShipmentNotAllowedFromSupplierException,
  SupplierShipmentNotAllowedFromPlatformException,
} from './order.exceptions';

export type TradeOrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'released'
  | 'completed'
  | 'disputed'
  | 'refunded'
  | 'cancelled'
  | 'fulfilled'; // legacy alias for completed — kept for backwards compat

export type ShippingMethod = 'platform' | 'supplier';

export interface OrderLine {
  productId: string;
  productName: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PlatformShippingSnapshot {
  courierPartnerId: number;
  destination: {
    line1: string;
    cityId: number;
    country: string;
    postalCode?: string;
  };
}

export interface CreateTradeOrderProps {
  buyerId: number;
  supplierId: number;
  lines: OrderLine[];
  currency: string;
  paymentIntentId: string;
  paymobOrderId: string;
  cartItemIds: string[];
  shippingMethod?: ShippingMethod;
  platformShippingSnapshot?: PlatformShippingSnapshot | null;
  shippingCost?: number;
}

export interface ReconstitutedTradeOrderProps {
  _id: string;
  internalId: number;
  referenceNumber: string | null;
  buyerId: number;
  supplierId: number;
  lines: OrderLine[];
  subtotal: number;
  shippingCost: number;
  currency: string;
  status: TradeOrderStatus;
  paymentIntentId: string | null;
  paymobOrderId: string | null;
  cartItemIds: string[];
  shippingMethod: ShippingMethod;
  platformShippingSnapshot: PlatformShippingSnapshot | null;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  releasedAt: Date | null;
  autoReleaseAt: Date | null;
  protectionWindowDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export class TradeOrder {
  private constructor(
    private readonly _id: string,
    private _internalId: number | null,
    private _referenceNumber: string | null,
    private readonly _buyerId: number,
    private readonly _supplierId: number,
    private readonly _lines: OrderLine[],
    private readonly _subtotal: number,
    private readonly _shippingCost: number,
    private readonly _currency: string,
    private _status: TradeOrderStatus,
    private readonly _paymentIntentId: string | null,
    private readonly _paymobOrderId: string | null,
    private readonly _cartItemIds: string[],
    private readonly _shippingMethod: ShippingMethod,
    private readonly _platformShippingSnapshot: PlatformShippingSnapshot | null,
    private _carrier: string | null,
    private _trackingNumber: string | null,
    private _trackingUrl: string | null,
    private _shippedAt: Date | null,
    private _deliveredAt: Date | null,
    private _releasedAt: Date | null,
    private _autoReleaseAt: Date | null,
    private _protectionWindowDays: number,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateTradeOrderProps): TradeOrder {
    const subtotal = props.lines.reduce((s, l) => s + l.lineTotal, 0);
    return new TradeOrder(
      randomUUID(),
      null,
      null,
      props.buyerId,
      props.supplierId,
      props.lines,
      subtotal,
      props.shippingCost ?? 0,
      props.currency,
      'pending_payment',
      props.paymentIntentId,
      props.paymobOrderId,
      props.cartItemIds,
      props.shippingMethod ?? 'supplier',
      props.platformShippingSnapshot ?? null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      14,
      new Date(),
      new Date(),
    );
  }

  static reconstitute(props: ReconstitutedTradeOrderProps): TradeOrder {
    return new TradeOrder(
      props._id,
      props.internalId,
      props.referenceNumber,
      props.buyerId,
      props.supplierId,
      props.lines,
      props.subtotal,
      props.shippingCost,
      props.currency,
      props.status,
      props.paymentIntentId,
      props.paymobOrderId,
      props.cartItemIds,
      props.shippingMethod,
      props.platformShippingSnapshot,
      props.carrier,
      props.trackingNumber,
      props.trackingUrl,
      props.shippedAt,
      props.deliveredAt,
      props.releasedAt,
      props.autoReleaseAt,
      props.protectionWindowDays,
      props.createdAt,
      props.updatedAt,
    );
  }

  private assertStatus(allowed: TradeOrderStatus[], action: string): void {
    if (!allowed.includes(this._status)) {
      throw new OrderTransitionException(this._id, this._status, action);
    }
  }

  markAsPaid(): void {
    this.assertStatus(['pending_payment'], 'pay');
    this._status = 'paid';
    this._updatedAt = new Date();
  }

  private transitionToShipped(
    carrier: string,
    trackingNumber: string,
    trackingUrl: string | null,
  ): void {
    this.assertStatus(['paid'], 'ship');
    this._status = 'shipped';
    this._carrier = carrier;
    this._trackingNumber = trackingNumber;
    this._trackingUrl = trackingUrl;
    this._shippedAt = new Date();
    this._updatedAt = new Date();
  }

  markAsShippedBySupplier(
    carrier: string,
    trackingNumber: string,
    trackingUrl: string | null = null,
  ): void {
    if (this._shippingMethod !== 'supplier') {
      throw new PlatformShipmentNotAllowedFromSupplierException(this._id);
    }

    this.transitionToShipped(carrier, trackingNumber, trackingUrl);
  }

  markAsShippedByPlatform(
    carrier: string,
    trackingNumber: string,
    trackingUrl: string | null,
  ): void {
    if (this._shippingMethod !== 'platform') {
      throw new SupplierShipmentNotAllowedFromPlatformException(this._id);
    }

    this.transitionToShipped(carrier, trackingNumber, trackingUrl);
  }

  markAsShipped(carrier: string, trackingNumber: string): void {
    this.markAsShippedBySupplier(carrier, trackingNumber);
  }

  markAsDelivered(): void {
    this.assertStatus(['shipped'], 'deliver');
    const now = new Date();
    this._status = 'delivered';
    this._deliveredAt = now;
    this._autoReleaseAt = new Date(
      now.getTime() + this._protectionWindowDays * 24 * 60 * 60 * 1000,
    );
    this._updatedAt = now;
  }

  confirmReceipt(): void {
    this.assertStatus(['delivered'], 'confirm_receipt');
    const now = new Date();
    this._status = 'released';
    this._releasedAt = now;
    this._updatedAt = now;
  }

  release(): void {
    this.assertStatus(['delivered', 'disputed'], 'release');
    const now = new Date();
    this._status = 'released';
    this._releasedAt = now;
    this._updatedAt = now;
  }

  complete(): void {
    this.assertStatus(['released'], 'complete');
    this._status = 'completed';
    this._updatedAt = new Date();
  }

  openDispute(): void {
    this.assertStatus(['shipped', 'delivered'], 'open_dispute');
    this._status = 'disputed';
    this._updatedAt = new Date();
  }

  refund(): void {
    this.assertStatus(['disputed', 'delivered', 'shipped', 'paid'], 'refund');
    this._status = 'refunded';
    this._updatedAt = new Date();
  }

  cancel(): void {
    this.assertStatus(['pending_payment'], 'cancel');
    this._status = 'cancelled';
    this._updatedAt = new Date();
  }

  setReferenceNumber(ref: string): void {
    this._referenceNumber = ref;
  }

  setInternalId(id: number): void {
    this._internalId = id;
  }

  setProtectionWindowDays(days: number): void {
    this._protectionWindowDays = days;
  }

  get id(): string {
    return this._id;
  }
  get internalId(): number | null {
    return this._internalId;
  }
  get referenceNumber(): string | null {
    return this._referenceNumber;
  }
  get buyerId(): number {
    return this._buyerId;
  }
  get supplierId(): number {
    return this._supplierId;
  }
  get lines(): OrderLine[] {
    return this._lines;
  }
  get subtotal(): number {
    return this._subtotal;
  }
  get shippingCost(): number {
    return this._shippingCost;
  }
  get currency(): string {
    return this._currency;
  }
  get status(): TradeOrderStatus {
    return this._status;
  }
  get paymentIntentId(): string | null {
    return this._paymentIntentId;
  }
  get paymobOrderId(): string | null {
    return this._paymobOrderId;
  }
  get cartItemIds(): string[] {
    return this._cartItemIds;
  }
  get shippingMethod(): ShippingMethod {
    return this._shippingMethod;
  }
  get platformShippingSnapshot(): PlatformShippingSnapshot | null {
    return this._platformShippingSnapshot;
  }
  get carrier(): string | null {
    return this._carrier;
  }
  get trackingNumber(): string | null {
    return this._trackingNumber;
  }
  get trackingUrl(): string | null {
    return this._trackingUrl;
  }
  get shippedAt(): Date | null {
    return this._shippedAt;
  }
  get deliveredAt(): Date | null {
    return this._deliveredAt;
  }
  get releasedAt(): Date | null {
    return this._releasedAt;
  }
  get autoReleaseAt(): Date | null {
    return this._autoReleaseAt;
  }
  get protectionWindowDays(): number {
    return this._protectionWindowDays;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
}
