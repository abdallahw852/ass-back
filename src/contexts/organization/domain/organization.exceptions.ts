import { ForbiddenException, NotFoundException } from '@nestjs/common';

/** Thrown when the session user is not associated with a supplier account. */
export class NotASupplierException extends ForbiddenException {
  constructor() {
    super('Access restricted to supplier accounts.');
  }
}

/** Thrown when a supplier member cannot be found by the given identifier. */
export class MemberNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super(`Team member not found: ${identifier}`);
  }
}
