import { ConflictException, NotFoundException } from '@nestjs/common';

export class InsufficientWalletBalanceException extends ConflictException {
  constructor(available: number, requested: number) {
    super(
      `Insufficient wallet balance: ${available} available, ${requested} requested.`,
    );
  }
}

export class WithdrawalNotFoundException extends NotFoundException {
  constructor() {
    super({
      code: 'WITHDRAWAL_NOT_FOUND',
      message: 'Withdrawal request not found.',
    });
  }
}

export class WithdrawalAlreadyProcessedException extends ConflictException {
  constructor() {
    super({
      code: 'WITHDRAWAL_ALREADY_PROCESSED',
      message: 'This withdrawal request has already been processed.',
    });
  }
}
