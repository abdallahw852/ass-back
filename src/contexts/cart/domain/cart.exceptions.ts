import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export class CartItemNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Cart item '${id}' not found.`);
  }
}

export class ProductNotAvailableException extends BadRequestException {
  constructor() {
    super('Product is not available for purchase.');
  }
}

export class BelowMinimumOrderQuantityException extends BadRequestException {
  constructor(moq: number) {
    super(`Minimum order quantity is ${moq}.`);
  }
}

export class DuplicateCartItemException extends ConflictException {
  constructor() {
    super(
      'This product (variant) is already in your cart. Update the quantity instead.',
    );
  }
}

export class ProductVariantNotFoundException extends NotFoundException {
  constructor(variantId: string) {
    super(`Product variant '${variantId}' not found.`);
  }
}

export class InactiveProductCannotBeAddedException extends BadRequestException {
  constructor(productId: string) {
    super(`Product '${productId}' is not active and cannot be added to cart.`);
  }
}

export class InactiveSupplierCannotBeAddedException extends BadRequestException {
  constructor() {
    super(
      'The supplier for this product is not active and cannot be added to cart.',
    );
  }
}

export class SupplierGroupNotFoundException extends NotFoundException {
  constructor(supplierId: string) {
    super(`Supplier group '${supplierId}' not found in cart.`);
  }
}

export class CartAttachmentNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Cart attachment '${id}' not found.`);
  }
}

export class BuyerAccessForbiddenException extends ForbiddenException {
  constructor() {
    super('Only buyers can access the cart.');
  }
}
