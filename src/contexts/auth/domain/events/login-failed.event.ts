import { DomainEvent } from '../../../../shared/domain/domain-event';

export type LoginFailedReason =
  | 'invalid_credentials'
  | 'unverified'
  | 'throttled';

export class LoginFailedEvent extends DomainEvent {
  private constructor(
    aggregateId: string,
    version: number,
    public readonly userId: number | null,
    public readonly email: string,
    public readonly ip: string,
    public readonly userAgent: string,
    public readonly reason: LoginFailedReason,
  ) {
    super(aggregateId, 'User', version);
  }

  static create(params: {
    aggregateId: string;
    version: number;
    userId: number | null;
    email: string;
    ip: string;
    userAgent: string;
    reason: LoginFailedReason;
  }): LoginFailedEvent {
    return new LoginFailedEvent(
      params.aggregateId,
      params.version,
      params.userId,
      params.email,
      params.ip,
      params.userAgent,
      params.reason,
    );
  }

  toPayload(): Record<string, unknown> {
    return {
      userId: this.userId,
      email: this.email,
      ip: this.ip,
      userAgent: this.userAgent,
      reason: this.reason,
    };
  }
}
