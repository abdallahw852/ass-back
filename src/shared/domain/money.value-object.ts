import { ValueObject } from './value-object';

type MoneyProps = {
  amount: number;
  currency: string;
};

export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  static of(amount: number, currency: string): Money {
    if (amount < 0) throw new Error('Money amount cannot be negative');
    if (!currency || currency.length !== 3)
      throw new Error('Currency must be a 3-letter ISO 4217 code');
    return new Money({
      amount: Math.round(amount * 100) / 100,
      currency: currency.toUpperCase(),
    });
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Money {
    return Money.of(this.amount * factor, this.currency);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency)
      throw new Error(
        `Currency mismatch: ${this.currency} vs ${other.currency}`,
      );
  }
}
