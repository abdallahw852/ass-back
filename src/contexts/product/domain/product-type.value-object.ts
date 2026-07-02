import { ValueObject } from '../../../shared/domain/value-object';
import { ProductType } from './enums/product-type.enum';
import { InvalidProductTypeException } from './product.exceptions';

interface ProductTypeProps {
  value: ProductType;
}

/**
 * Value object that wraps the ProductType enum and encapsulates
 * type-specific behaviour queries (shipping, variants, booking, etc.).
 */
export class ProductTypeVO extends ValueObject<ProductTypeProps> {
  private constructor(props: ProductTypeProps) {
    super(props);
  }

  static create(type: ProductType): ProductTypeVO {
    return new ProductTypeVO({ value: type });
  }

  static fromString(type: string): ProductTypeVO {
    if (!Object.values(ProductType).includes(type as ProductType)) {
      throw new InvalidProductTypeException(type);
    }
    return new ProductTypeVO({ value: type as ProductType });
  }

  get value(): ProductType {
    return this.props.value;
  }

  isBundle(): boolean {
    return this.props.value === ProductType.BUNDLE;
  }

  requiresShipping(): boolean {
    return [ProductType.READY, ProductType.FOOD].includes(this.props.value);
  }

  supportsVariants(): boolean {
    return [ProductType.READY, ProductType.FOOD].includes(this.props.value);
  }

  supportsBooking(): boolean {
    return [ProductType.SERVICE, ProductType.FOOD].includes(this.props.value);
  }

  supportsDigitalFile(): boolean {
    return [ProductType.DIGITAL, ProductType.DIGITAL_CARD].includes(
      this.props.value,
    );
  }
}
