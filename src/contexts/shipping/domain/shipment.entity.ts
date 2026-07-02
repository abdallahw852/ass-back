import { randomUUID } from 'node:crypto';
import type { TrackingEvent } from './tracking-event.value-object';

export type ShipmentStatus =
  | 'pending'
  | 'label_created'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export interface CreateShipmentProps {
  orderId: number;
  carrier: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  vendorOrderId: string | null;
  status?: ShipmentStatus;
  events?: TrackingEvent[];
}

export interface ReconstitutedShipmentProps extends CreateShipmentProps {
  _id: string;
  internalId: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Shipment {
  private constructor(
    private readonly _id: string,
    private _internalId: number | null,
    private readonly _orderId: number,
    private _carrier: string,
    private _trackingNumber: string | null,
    private _trackingUrl: string | null,
    private _vendorOrderId: string | null,
    private _status: ShipmentStatus,
    private _events: TrackingEvent[],
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateShipmentProps): Shipment {
    const now = new Date();
    return new Shipment(
      randomUUID(),
      null,
      props.orderId,
      props.carrier,
      props.trackingNumber,
      props.trackingUrl,
      props.vendorOrderId,
      props.status ?? 'label_created',
      props.events ?? [],
      now,
      now,
    );
  }

  static reconstitute(props: ReconstitutedShipmentProps): Shipment {
    return new Shipment(
      props._id,
      props.internalId,
      props.orderId,
      props.carrier,
      props.trackingNumber,
      props.trackingUrl,
      props.vendorOrderId,
      props.status ?? 'label_created',
      props.events ?? [],
      props.createdAt,
      props.updatedAt,
    );
  }

  appendEvent(event: TrackingEvent): void {
    this._events = [...this._events, event];
    this._status = event.status as ShipmentStatus;
    this._updatedAt = new Date();
  }

  setInternalId(id: number): void {
    this._internalId = id;
  }

  get id(): string {
    return this._id;
  }

  get internalId(): number | null {
    return this._internalId;
  }

  get orderId(): number {
    return this._orderId;
  }

  get carrier(): string {
    return this._carrier;
  }

  get trackingNumber(): string | null {
    return this._trackingNumber;
  }

  get trackingUrl(): string | null {
    return this._trackingUrl;
  }

  get vendorOrderId(): string | null {
    return this._vendorOrderId;
  }

  get status(): ShipmentStatus {
    return this._status;
  }

  get events(): TrackingEvent[] {
    return [...this._events];
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
