import { DomainEvent } from '../../../../shared/domain/domain-event';

export class OtpVerifiedEvent extends DomainEvent {
  private constructor(
    aggregateId: string,
    version: number,
    public readonly email: string,
    public readonly purpose: string,
  ) {
    super(aggregateId, 'User', version);
  }

  static create(params: {
    aggregateId: string;
    version: number;
    email: string;
    purpose: string;
  }): OtpVerifiedEvent {
    return new OtpVerifiedEvent(
      params.aggregateId,
      params.version,
      params.email,
      params.purpose,
    );
  }

  toPayload(): Record<string, unknown> {
    return { email: this.email, purpose: this.purpose };
  }
}
