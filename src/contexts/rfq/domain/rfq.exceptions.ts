import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export class RfqNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`RFQ '${id}' not found.`);
  }
}

export class QuotationNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Quotation '${id}' not found.`);
  }
}

export class ProductRfqProductNotFoundException extends NotFoundException {
  constructor(productId: string) {
    super(`Product '${productId}' not found.`);
  }
}

export class RfqAccessDeniedException extends ForbiddenException {
  constructor() {
    super('You do not have access to this RFQ.');
  }
}

export class QuotationAccessDeniedException extends ForbiddenException {
  constructor() {
    super('You do not have access to this quotation.');
  }
}

export class RfqClosedException extends BadRequestException {
  constructor() {
    super('This RFQ is no longer open for quotations.');
  }
}

export class RfqAlreadyAwardedException extends BadRequestException {
  constructor() {
    super('This RFQ has already been awarded.');
  }
}

export class DuplicateQuotationException extends BadRequestException {
  constructor() {
    super('You have already submitted a quotation for this RFQ.');
  }
}

export class InvalidDirectedRfqSupplierException extends ForbiddenException {
  constructor() {
    super('Only the assigned supplier can quote this RFQ.');
  }
}

export class QuotationAlreadyFinalizedException extends BadRequestException {
  constructor() {
    super('This quotation can no longer be modified.');
  }
}

export class InvalidQuotationAcceptanceException extends BadRequestException {
  constructor() {
    super('Only submitted quotations can be accepted.');
  }
}

export class SupplierCannotRfqOwnProductException extends ForbiddenException {
  constructor() {
    super('You cannot create an RFQ for a product you own.');
  }
}

export class SupplierNotFoundException extends NotFoundException {
  constructor() {
    super('Supplier not found.');
  }
}

export class RfqAttachmentUploadFailedException extends BadGatewayException {
  constructor() {
    super('Failed to upload one or more attachments.');
  }
}

export class RfqAttachmentCapExceededException extends BadRequestException {
  constructor() {
    super('Attachment limit exceeded. Maximum 10 files per RFQ.');
  }
}
