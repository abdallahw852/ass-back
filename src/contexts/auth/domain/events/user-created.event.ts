import { DomainEvent } from '../../../../shared/domain/domain-event';

export class UserCreatedEvent extends DomainEvent {
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
  }): UserCreatedEvent {
    return new UserCreatedEvent(
      params.aggregateId,
      params.version,
      params.email,
    );
  }

  toPayload(): Record<string, unknown> {
    return { email: this.email };
  }
}
