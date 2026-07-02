import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ProductStatus } from './enums/product-status.enum';

/** Thrown when a product cannot be found by the given identifier. */
export class ProductNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super(`Product not found: ${identifier}`);
  }
}

/** Thrown when a product variant cannot be found by the given identifier. */
export class ProductVariantNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super(`Product variant not found: ${identifier}`);
  }
}

/** Thrown when attempting to create a variant with a color/size combination that already exists. */
export class DuplicateVariantException extends ConflictException {
  constructor(color: string | null, size: string | null) {
    super(
      `A variant with color "${color ?? 'none'}" and size "${size ?? 'none'}" already exists.`,
    );
  }
}

/** Thrown when an unsupported or invalid product type is provided. */
export class InvalidProductTypeException extends BadRequestException {
  constructor(type: string) {
    super(`Invalid product type: ${type}`);
  }
}

/** Thrown when a bundle product attempts to include itself as a child item. */
export class BundleItemSelfReferenceException extends BadRequestException {
  constructor() {
    super('A bundle product cannot include itself as a bundle item.');
  }
}

/** Thrown when a child product is already part of the bundle. */
export class DuplicateBundleItemException extends ConflictException {
  constructor(childProductId: string) {
    super(`Product "${childProductId}" is already a bundle item.`);
  }
}

/** Thrown when uploading images would exceed the maximum allowed count. */
export class MaxImagesExceededException extends BadRequestException {
  constructor(max: number) {
    super(`A product can have at most ${max} images.`);
  }
}

/** Thrown when a product SKU conflicts with an existing one. */
export class DuplicateSkuException extends ConflictException {
  constructor(sku: string) {
    super(`SKU "${sku}" is already in use.`);
  }
}

/** Thrown when the provided categoryId does not match any existing category. */
export class InvalidCategoryException extends BadRequestException {
  constructor(categoryId: string) {
    super(`Category not found: ${categoryId}`);
  }
}

/** Thrown when variants are added to a product type that does not support them. */
export class VariantsNotSupportedException extends BadRequestException {
  constructor(type: string) {
    super(`Product type "${type}" does not support variants.`);
  }
}

/** Thrown when booking fields are provided for a product type that does not support booking. */
export class BookingFieldsNotSupportedException extends BadRequestException {
  constructor(type: string) {
    super(`Product type "${type}" does not support booking fields.`);
  }
}

/** Thrown when digital file fields are provided for a product type that does not support digital files. */
export class DigitalFieldsNotSupportedException extends BadRequestException {
  constructor(type: string) {
    super(`Product type "${type}" does not support digital file fields.`);
  }
}

/** Thrown when a product status transition is not allowed by the state machine. */
export class InvalidProductStatusTransitionException extends BadRequestException {
  constructor(from: ProductStatus, to: string) {
    super({
      code: 'INVALID_PRODUCT_STATUS_TRANSITION',
      message: `Cannot transition product from '${from}' to '${to}'.`,
    });
  }
}
