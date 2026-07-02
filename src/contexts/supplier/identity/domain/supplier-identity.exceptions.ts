import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export class SupplierNotVerifiedException extends ForbiddenException {
  constructor(reason: string) {
    super(reason);
  }
}

export class SupplierNotFoundException extends NotFoundException {
  constructor(supplierId: string) {
    super({
      code: 'SUPPLIER_NOT_FOUND',
      message: `Supplier '${supplierId}' not found.`,
    });
  }
}

export class InvalidSupplierStatusTransitionException extends BadRequestException {
  constructor(message: string) {
    super({ code: 'INVALID_SUPPLIER_STATUS_TRANSITION', message });
  }
}
