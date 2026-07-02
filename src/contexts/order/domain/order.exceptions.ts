import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export class OrderNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Order '${id}' not found.`);
  }
}

export class EmptyCartException extends BadRequestException {
  constructor() {
    super('Cannot checkout an empty cart.');
  }
}

export class ProductUnavailableException extends BadRequestException {
  constructor(productId: string) {
    super(`Product '${productId}' is no longer available.`);
  }
}

export class OrderTransitionException extends BadRequestException {
  constructor(orderId: string, currentStatus: string, action: string) {
    super(
      `Cannot perform '${action}' on order '${orderId}' with status '${currentStatus}'.`,
    );
  }
}

export class OrderAccessDeniedException extends ForbiddenException {
  constructor(orderId: string) {
    super(`Access denied for order '${orderId}'.`);
  }
}

export class PlatformShipmentNotAllowedFromSupplierException extends BadRequestException {
  constructor(orderId: string) {
    super(
      `Order '${orderId}' uses platform shipping and cannot be shipped by supplier.`,
    );
  }
}

export class SupplierShipmentNotAllowedFromPlatformException extends BadRequestException {
  constructor(orderId: string) {
    super(
      `Order '${orderId}' uses supplier shipping and cannot be shipped by platform.`,
    );
  }
}

export class RefundAmountExceededException extends BadRequestException {
  constructor(requested: number, available: number) {
    super(`Refund amount ${requested} exceeds available amount ${available}.`);
  }
}

export class OrderDraftNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Order draft '${id}' not found.`);
  }
}

export class OrderDraftAlreadyCheckedOutException extends BadRequestException {
  constructor(id: string) {
    super(`Order draft '${id}' has already been checked out.`);
  }
}
