import { randomUUID } from 'node:crypto';
import { StockMovementReason } from './enums/stock-movement-reason.enum';

export interface CreateStockMovementProps {
  inventoryItemInternalId: number;
  delta: number;
  balanceAfter: number;
  reason: StockMovementReason;
  note?: string | null;
  actorUserId: number;
}

export interface ReconstitutedStockMovementProps {
  _id: string;
  internalId: number;
  inventoryItemInternalId: number;
  delta: number;
  balanceAfter: number;
  reason: StockMovementReason;
  note: string | null;
  actorUserId: number;
  occurredAt: Date;
}

export class StockMovement {
  private constructor(
    private readonly _id: string,
    private _internalId: number | null,
    private readonly _inventoryItemInternalId: number,
    private readonly _delta: number,
    private readonly _balanceAfter: number,
    private readonly _reason: StockMovementReason,
    private readonly _note: string | null,
    private readonly _actorUserId: number,
    private readonly _occurredAt: Date,
  ) {}

  static create(props: CreateStockMovementProps): StockMovement {
    return new StockMovement(
      randomUUID(),
      null,
      props.inventoryItemInternalId,
      props.delta,
      props.balanceAfter,
      props.reason,
      props.note ?? null,
      props.actorUserId,
      new Date(),
    );
  }

  static reconstitute(props: ReconstitutedStockMovementProps): StockMovement {
    return new StockMovement(
      props._id,
      props.internalId,
      props.inventoryItemInternalId,
      props.delta,
      props.balanceAfter,
      props.reason,
      props.note,
      props.actorUserId,
      props.occurredAt,
    );
  }

  get id(): string {
    return this._id;
  }
  get internalId(): number | null {
    return this._internalId;
  }
  get inventoryItemInternalId(): number {
    return this._inventoryItemInternalId;
  }
  get delta(): number {
    return this._delta;
  }
  get balanceAfter(): number {
    return this._balanceAfter;
  }
  get reason(): StockMovementReason {
    return this._reason;
  }
  get note(): string | null {
    return this._note;
  }
  get actorUserId(): number {
    return this._actorUserId;
  }
  get occurredAt(): Date {
    return this._occurredAt;
  }
}
