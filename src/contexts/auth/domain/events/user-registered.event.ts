import { DomainEvent } from '../../../../shared/domain/domain-event';

export class UserRegisteredEvent extends DomainEvent {
  private constructor(
    aggregateId: string,
    version: number,
    public readonly email: string,
    public readonly hasPassword: boolean,
  ) {
    super(aggregateId, 'User', version);
  }

  static create(params: {
    aggregateId: string;
    version: number;
    email: string;
    hasPassword: boolean;
  }): UserRegisteredEvent {
    return new UserRegisteredEvent(
      params.aggregateId,
      params.version,
      params.email,
      params.hasPassword,
    );
  }

  toPayload(): Record<string, unknown> {
    return { email: this.email, hasPassword: this.hasPassword };
  }
}
