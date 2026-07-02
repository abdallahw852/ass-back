import { ValueObject } from '../../../shared/domain/value-object';

interface PricingTierProps {
  minQuantity: number;
  maxQuantity: number | null;
  unitPrice: number;
}

/**
 * Value object representing a quantity-based pricing tier.
 *
 * Used for tiered pricing rules such as "buy 10+ at 8.50 each".
 * Immutable once created.
 */
export class PricingTier extends ValueObject<PricingTierProps> {
  private constructor(props: PricingTierProps) {
    super(props);
  }

  static create(
    minQuantity: number,
    maxQuantity: number | null,
    unitPrice: number,
  ): PricingTier {
    if (minQuantity < 1) {
      throw new Error('Minimum quantity must be at least 1.');
    }
    if (unitPrice < 0) {
      throw new Error('Unit price cannot be negative.');
    }
    if (maxQuantity !== null && maxQuantity <= minQuantity) {
      throw new Error('Maximum quantity must exceed minimum quantity.');
    }
    return new PricingTier({ minQuantity, maxQuantity, unitPrice });
  }

  get minQuantity(): number {
    return this.props.minQuantity;
  }

  get maxQuantity(): number | null {
    return this.props.maxQuantity;
  }

  get unitPrice(): number {
    return this.props.unitPrice;
  }

  /** Check whether a given quantity falls within this tier. */
  covers(quantity: number): boolean {
    if (quantity < this.props.minQuantity) return false;
    if (this.props.maxQuantity !== null && quantity > this.props.maxQuantity) {
      return false;
    }
    return true;
  }
}
