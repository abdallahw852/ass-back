import { ValueObject } from './value-object';

type AddressProps = {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export class Address extends ValueObject<AddressProps> {
  private constructor(props: AddressProps) {
    super(props);
  }

  static create(props: {
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }): Address {
    if (
      !props.line1 ||
      !props.city ||
      !props.state ||
      !props.postalCode ||
      !props.country
    ) {
      throw new Error('Address is missing required fields');
    }
    return new Address({
      line1: props.line1,
      line2: props.line2 ?? null,
      city: props.city,
      state: props.state,
      postalCode: props.postalCode,
      country: props.country.toUpperCase(),
    });
  }

  toJSON(): AddressProps {
    return { ...this.props };
  }
}
