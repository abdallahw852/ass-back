import { DomainEvent } from '../../../../../shared/domain/domain-event';

export class SupplierRegisteredEvent extends DomainEvent {
  private constructor(
    aggregateId: string,
    version: number,
    public readonly companyName: string,
  ) {
    super(aggregateId, 'Supplier', version);
  }

  static create(params: {
    aggregateId: string;
    version: number;
    companyName: string;
  }): SupplierRegisteredEvent {
    return new SupplierRegisteredEvent(
      params.aggregateId,
      params.version,
      params.companyName,
    );
  }

  toPayload(): Record<string, unknown> {
    return { companyName: this.companyName };
  }
}
