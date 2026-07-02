import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

export class InventoryItemNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Inventory item '${id}' not found.`);
  }
}

export class InsufficientStockException extends ConflictException {
  constructor(available: number, requested: number) {
    super(
      `Insufficient stock: ${available} available, ${requested} requested.`,
    );
  }
}

export class InvalidStockAdjustmentException extends BadRequestException {
  constructor(reason: string) {
    super(`Invalid stock adjustment: ${reason}`);
  }
}
