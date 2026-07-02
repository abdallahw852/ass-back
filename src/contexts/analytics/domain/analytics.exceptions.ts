import { BadRequestException } from '@nestjs/common';

export class AnalyticsException extends BadRequestException {
  constructor(message = 'Analytics operation failed') {
    super(message);
  }
}
