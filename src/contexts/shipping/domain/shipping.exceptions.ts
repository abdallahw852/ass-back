import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

export class ShipmentNotFoundException extends NotFoundException {
  constructor(orderId: string) {
    super(`Shipment for order '${orderId}' not found.`);
  }
}

export class ShipmentAlreadyExistsException extends BadRequestException {
  constructor(orderId: string) {
    super(`Shipment for order '${orderId}' already exists.`);
  }
}

export class PlatformShippingDisabledException extends ServiceUnavailableException {
  constructor() {
    super('Platform shipping is not enabled yet.');
  }
}

export class MissingPlatformShippingSnapshotException extends BadRequestException {
  constructor(orderId: string) {
    super(
      `Order '${orderId}' is missing platform shipping snapshot. Select a courier before checkout.`,
    );
  }
}

export class WebhookUnauthorizedException extends BadRequestException {
  constructor() {
    super('Webhook authorization failed.');
  }
}
