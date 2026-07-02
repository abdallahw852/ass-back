import { DomainEvent } from '../../../../shared/domain/domain-event';

export class ProductDeletedEvent extends DomainEvent {
  private constructor(aggregateId: string) {
    super(aggregateId, 'Product', 1);
  }

  static create(aggregateId: string): ProductDeletedEvent {
    return new ProductDeletedEvent(aggregateId);
  }

  toPayload(): Record<string, unknown> {
    return {};
  }
}
