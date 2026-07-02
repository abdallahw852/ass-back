import { randomUUID } from 'node:crypto';
import { StockMovement } from './stock-movement.entity';
import { StockMovementReason } from './enums/stock-movement-reason.enum';
import {
  InsufficientStockException,
  InvalidStockAdjustmentException,
} from './inventory.exceptions';

export interface CreateInventoryItemProps {
  supplierId: number;
  productId: number;
  variantId: number | null;
  sku: string | null;
  onHand?: number;
  minStockThreshold?: number;
}

export interface ReconstitutedInventoryItemProps {
  _id: string;
  internalId: number;
  supplierId: number;
  productId: number;
  variantId: number | null;
  sku: string | null;
  onHand: number;
  reservedQty: number;
  minStockThreshold: number;
  lastMovementAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type InventoryStatus = 'available' | 'low' | 'out';

export class InventoryItem {
  private constructor(
    private readonly _id: string,
    private _internalId: number | null,
    private readonly _supplierId: number,
    private readonly _productId: number,
    private readonly _variantId: number | null,
    private _sku: string | null,
    private _onHand: number,
    private _reservedQty: number,
    private _minStockThreshold: number,
    private _lastMovementAt: Date | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateInventoryItemProps): InventoryItem {
    return new InventoryItem(
      randomUUID(),
      null,
      props.supplierId,
      props.productId,
      props.variantId,
      props.sku,
      props.onHand ?? 0,
      0,
      props.minStockThreshold ?? 0,
      null,
      new Date(),
      new Date(),
    );
  }

  static reconstitute(props: ReconstitutedInventoryItemProps): InventoryItem {
    return new InventoryItem(
      props._id,
      props.internalId,
      props.supplierId,
      props.productId,
      props.variantId,
      props.sku,
      props.onHand,
      props.reservedQty,
      props.minStockThreshold,
      props.lastMovementAt,
      props.createdAt,
      props.updatedAt,
    );
  }

  // ── Getters ──────────────────────────────────────────────────────

  get id(): string {
    return this._id;
  }
  get internalId(): number | null {
    return this._internalId;
  }
  get supplierId(): number {
    return this._supplierId;
  }
  get productId(): number {
    return this._productId;
  }
  get variantId(): number | null {
    return this._variantId;
  }
  get sku(): string | null {
    return this._sku;
  }
  get onHand(): number {
    return this._onHand;
  }
  get reservedQty(): number {
    return this._reservedQty;
  }
  get minStockThreshold(): number {
    return this._minStockThreshold;
  }
  get lastMovementAt(): Date | null {
    return this._lastMovementAt;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  get status(): InventoryStatus {
    if (this._onHand === 0) return 'out';
    if (this._onHand <= this._minStockThreshold) return 'low';
    return 'available';
  }

  // ── Behaviour ────────────────────────────────────────────────────

  /**
   * Record a stock adjustment.
   *
   * For STOCK_AUDIT the supplied value is treated as an absolute count —
   * the delta is derived as (absolute - onHand). For all other reasons
   * the value is a signed delta directly.
   *
   * @throws {InvalidStockAdjustmentException} if delta is zero.
   * @throws {InsufficientStockException} if the result would go negative.
   */
  adjust(
    value: number,
    reason: StockMovementReason,
    actorUserId: number,
    note?: string | null,
  ): StockMovement {
    const delta =
      reason === StockMovementReason.STOCK_AUDIT ? value - this._onHand : value;

    if (delta === 0) {
      throw new InvalidStockAdjustmentException('delta cannot be zero');
    }

    const newOnHand = this._onHand + delta;
    if (newOnHand < 0) {
      throw new InsufficientStockException(this._onHand, Math.abs(delta));
    }

    this._onHand = newOnHand;
    this._lastMovementAt = new Date();
    this._updatedAt = new Date();

    return StockMovement.create({
      inventoryItemInternalId: this._internalId!,
      delta,
      balanceAfter: newOnHand,
      reason,
      note: note ?? null,
      actorUserId,
    });
  }

  setMinThreshold(threshold: number): void {
    if (threshold < 0) {
      throw new InvalidStockAdjustmentException(
        'minStockThreshold cannot be negative',
      );
    }
    this._minStockThreshold = threshold;
    this._updatedAt = new Date();
  }

  updateSku(sku: string | null): void {
    this._sku = sku;
    this._updatedAt = new Date();
  }
}
