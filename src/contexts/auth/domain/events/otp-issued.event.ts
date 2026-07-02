import { DomainEvent } from '../../../../shared/domain/domain-event';

export class OtpIssuedEvent extends DomainEvent {
  private constructor(
    aggregateId: string,
    version: number,
    public readonly email: string,
    public readonly purpose: string,
    public readonly expiresAt: Date,
  ) {
    super(aggregateId, 'User', version);
  }

  static create(params: {
    aggregateId: string;
    version: number;
    email: string;
    purpose: string;
    expiresAt: Date;
  }): OtpIssuedEvent {
    return new OtpIssuedEvent(
      params.aggregateId,
      params.version,
      params.email,
      params.purpose,
      params.expiresAt,
    );
  }

  toPayload(): Record<string, unknown> {
    return {
      email: this.email,
      purpose: this.purpose,
      expiresAt: this.expiresAt,
    };
  }
}
