export class Address {
  readonly line1: string;
  readonly line2: string | null;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly country: string;

  private constructor(props: {
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }) {
    if (
      !props.line1 ||
      !props.city ||
      !props.state ||
      !props.postalCode ||
      !props.country
    ) {
      throw new Error('Address is missing required fields');
    }
    this.line1 = props.line1;
    this.line2 = props.line2 ?? null;
    this.city = props.city;
    this.state = props.state;
    this.postalCode = props.postalCode;
    this.country = props.country.toUpperCase();
  }

  static create(props: {
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }): Address {
    return new Address(props);
  }

  equals(other: Address): boolean {
    return (
      this.line1 === other.line1 &&
      this.line2 === other.line2 &&
      this.city === other.city &&
      this.state === other.state &&
      this.postalCode === other.postalCode &&
      this.country === other.country
    );
  }

  toJSON() {
    return {
      line1: this.line1,
      line2: this.line2,
      city: this.city,
      state: this.state,
      postalCode: this.postalCode,
      country: this.country,
    };
  }
}
