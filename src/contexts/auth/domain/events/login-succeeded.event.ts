import { DomainEvent } from '../../../../shared/domain/domain-event';

export class LoginSucceededEvent extends DomainEvent {
  private constructor(
    aggregateId: string,
    version: number,
    public readonly userId: number,
    public readonly email: string,
    public readonly ip: string,
    public readonly userAgent: string,
  ) {
    super(aggregateId, 'User', version);
  }

  static create(params: {
    aggregateId: string;
    version: number;
    userId: number;
    email: string;
    ip: string;
    userAgent: string;
  }): LoginSucceededEvent {
    return new LoginSucceededEvent(
      params.aggregateId,
      params.version,
      params.userId,
      params.email,
      params.ip,
      params.userAgent,
    );
  }

  toPayload(): Record<string, unknown> {
    return {
      userId: this.userId,
      email: this.email,
      ip: this.ip,
      userAgent: this.userAgent,
    };
  }
}
