import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

export class SupplierProfileNotFoundException extends NotFoundException {
  constructor() {
    super('Supplier profile not found.');
  }
}

export class PlanNotFoundException extends NotFoundException {
  constructor() {
    super('Plan not found.');
  }
}

export class PlanInactiveException extends BadRequestException {
  constructor() {
    super('Plan is no longer available.');
  }
}

export class NoActiveSubscriptionException extends NotFoundException {
  constructor() {
    super('No active subscription found.');
  }
}

export class AlreadyOnRequestedPlanException extends ConflictException {
  constructor() {
    super('Already subscribed to this plan.');
  }
}

export class CannotUpgradeToFreePlanException extends BadRequestException {
  constructor() {
    super('Cannot upgrade to the free plan. Use cancel instead.');
  }
}

export class SubscriptionAlreadyCancelledException extends ConflictException {
  constructor() {
    super('Subscription is already scheduled for cancellation.');
  }
}

export class DefaultPlanNotConfiguredException extends InternalServerErrorException {
  constructor() {
    super('No default plan is configured.');
  }
}
