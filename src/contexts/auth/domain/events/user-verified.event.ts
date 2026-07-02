import { DomainEvent } from '../../../../shared/domain/domain-event';

export class UserVerifiedEvent extends DomainEvent {
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
  }): UserVerifiedEvent {
    return new UserVerifiedEvent(
      params.aggregateId,
      params.version,
      params.email,
    );
  }

  toPayload(): Record<string, unknown> {
    return { email: this.email };
  }
}
