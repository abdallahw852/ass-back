import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export class ReturnRequestNotFoundException extends NotFoundException {
  constructor() {
    super('Return request not found.');
  }
}

export class InvalidReturnStatusTransitionException extends BadRequestException {
  constructor(returnId: string, status: string, action: string) {
    super(
      `Cannot perform '${action}' on return request '${returnId}' with status '${status}'.`,
    );
  }
}

export class ReturnRequestAccessDeniedException extends ForbiddenException {
  constructor() {
    super('You do not have access to this return request.');
  }
}

export class OrderNotFoundForReturnException extends NotFoundException {
  constructor() {
    super('Order not found for this return request.');
  }
}
