import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export class ClientNotFoundException extends NotFoundException {
  constructor() {
    super('Client not found.');
  }
}

export class SupplierNotFoundForUserException extends BadRequestException {
  constructor() {
    super('Supplier profile not found for the current user.');
  }
}

export class DuplicateClientEmailException extends ConflictException {
  constructor(email: string) {
    super(`A client with email '${email}' already exists.`);
  }
}
