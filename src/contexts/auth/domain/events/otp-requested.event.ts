import { DomainEvent } from '../../../../shared/domain/domain-event';

export class OtpRequestedEvent extends DomainEvent {
  private constructor(
    aggregateId: string,
    version: number,
    public readonly email: string,
  ) {
    super(aggregateId, 'User', version);
  }

  static create(params: {
    aggregateId: string;
    version: number;
    email: string;
  }): OtpRequestedEvent {
    return new OtpRequestedEvent(
      params.aggregateId,
      params.version,
      params.email,
    );
  }

  toPayload(): Record<string, unknown> {
    return { email: this.email };
  }
}
